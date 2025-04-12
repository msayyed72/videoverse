document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const uploadForm = document.getElementById('uploadForm');
    const uploadBtn = document.getElementById('uploadBtn');
    const processingCard = document.getElementById('processingCard');
    const progressBar = document.getElementById('progressBar');
    const statusMessage = document.getElementById('statusMessage');
    const statusPercentage = document.getElementById('statusPercentage');
    const downloadBtn = document.getElementById('downloadBtn');
    const videoInput = document.getElementById('video');
    const langSelect = document.getElementById('target_language');

    // Current job ID and polling interval
    let currentJobId = null;
    let pollingInterval = null;
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 150; // 5 minutes (2s interval * 150)

    // Form validation with additional checks
    uploadForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Check file type and size
        const file = videoInput.files[0];
        
        if (!file) {
            showAlert('Please select a video file to upload.', 'warning');
            uploadForm.classList.add('was-validated');
            return;
        }
        
        // Check file extension
        const fileName = file.name.toLowerCase();
        const validExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
        const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!isValidExtension) {
            showAlert('Invalid file format. Please upload a video in MP4, AVI, MOV, MKV, or WEBM format.', 'warning');
            return;
        }
        
        // Check file size (max 500MB)
        const MAX_SIZE = 500 * 1024 * 1024; // 500MB in bytes
        
        if (file.size > MAX_SIZE) {
            showAlert('File is too large. Maximum size is 500MB.', 'warning');
            return;
        }
        
        // Check if language is selected
        if (!langSelect.value) {
            showAlert('Please select a target language.', 'warning');
            uploadForm.classList.add('was-validated');
            return;
        }
        
        // All validations passed, submit the form
        uploadVideo();
    });
    
    // Clear error indicators when input changes
    videoInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            // Show file name in a user-friendly way
            const fileName = this.files[0].name;
            const fileSize = formatFileSize(this.files[0].size);
            
            // Display file info
            const fileInfoEl = document.createElement('div');
            fileInfoEl.className = 'mt-2 small';
            fileInfoEl.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="fas fa-file-video me-2 text-primary"></i>
                    <span>${fileName} (${fileSize})</span>
                </div>
            `;
            
            // Remove existing file info if any
            const existingInfo = this.parentNode.querySelector('.mt-2');
            if (existingInfo) {
                existingInfo.remove();
            }
            
            // Add new file info
            this.parentNode.appendChild(fileInfoEl);
        }
    });

    // Function to format file size in a readable way
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Function to upload video
    function uploadVideo() {
        // Get form data
        const formData = new FormData(uploadForm);
        
        // Disable upload button and show loading state
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Uploading...';
        
        // Show processing card with smooth animation
        processingCard.style.display = 'block';
        processingCard.style.opacity = '0';
        setTimeout(() => {
            processingCard.style.transition = 'opacity 0.5s ease';
            processingCard.style.opacity = '1';
        }, 10);
        
        // Scroll to processing card
        window.scrollTo({
            top: processingCard.offsetTop - 20,
            behavior: 'smooth'
        });
        
        // Reset progress
        updateProgress(0, 'Preparing to upload video...');
        
        // Send AJAX request with upload progress
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', '/upload', true);
        
        // Track upload progress
        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 20); // Max 20% for upload
                updateProgress(percentComplete, 'Uploading video...');
            }
        };
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    
                    if (data.success) {
                        // Store job ID
                        currentJobId = data.job_id;
                        
                        // Start polling for job status
                        updateProgress(20, 'Upload complete. Starting processing...');
                        startPolling(currentJobId);
                    } else {
                        // Handle error from server
                        showError(data.message || 'Error uploading video');
                        resetForm();
                    }
                } catch (e) {
                    showError('Error processing server response');
                    resetForm();
                }
            } else {
                showError('Server error. Please try again later.');
                resetForm();
            }
        };
        
        xhr.onerror = function() {
            showError('Network error. Please check your connection and try again.');
            resetForm();
        };
        
        xhr.send(formData);
    }

    // Function to start polling for job status
    function startPolling(jobId) {
        // Reset poll attempts
        pollAttempts = 0;
        
        // Clear any existing interval
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        
        // Set polling interval (check every 2 seconds)
        pollingInterval = setInterval(() => {
            pollAttempts++;
            
            // Stop polling after MAX_POLL_ATTEMPTS
            if (pollAttempts > MAX_POLL_ATTEMPTS) {
                clearInterval(pollingInterval);
                showError('Processing is taking too long. Please try again with a shorter video.');
                resetForm();
                return;
            }
            
            checkJobStatus(jobId);
        }, 2000);
    }

    // Function to check job status
    function checkJobStatus(jobId) {
        fetch(`/status/${jobId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to get job status');
                }
                return response.json();
            })
            .then(data => {
                // Update progress UI
                updateProgress(data.progress, data.message);
                
                // Check if job is complete or has error
                if (data.status === 'completed') {
                    // Stop polling
                    clearInterval(pollingInterval);
                    
                    // Enable download button with animation
                    downloadBtn.style.display = 'block';
                    downloadBtn.href = `/download/${jobId}`;
                    
                    // Update progress to 100%
                    updateProgress(100, 'Processing completed successfully!');
                    
                    // Reset upload button
                    resetForm(false);
                    
                    // Show success message
                    showAlert('<strong>Success!</strong> Your video has been dubbed. Click the download button to get your file.', 'success');
                    
                    // Scroll to download button
                    window.scrollTo({
                        top: downloadBtn.offsetTop - 100,
                        behavior: 'smooth'
                    });
                } else if (data.status === 'error') {
                    // Stop polling
                    clearInterval(pollingInterval);
                    
                    // Show error
                    showError(data.message || 'An error occurred during processing');
                    
                    // Reset form
                    resetForm();
                }
            })
            .catch(error => {
                console.error('Error checking job status:', error);
                pollAttempts++; // Count errors toward max attempts
                
                // After 5 failed attempts in a row, show a warning
                if (pollAttempts % 5 === 0) {
                    showAlert('Having trouble connecting to the server. Still trying...', 'warning', false);
                }
            });
    }

    // Function to update progress UI
    function updateProgress(percent, message) {
        // Ensure percent is a number between 0 and 100
        percent = Math.min(Math.max(parseInt(percent) || 0, 0), 100);
        
        // Animate progress bar
        progressBar.style.width = `${percent}%`;
        progressBar.setAttribute('aria-valuenow', percent);
        
        // Update text with animation if it changed
        if (statusPercentage.textContent !== `${percent}%`) {
            statusPercentage.classList.add('animate__animated', 'animate__fadeIn');
            setTimeout(() => {
                statusPercentage.classList.remove('animate__animated', 'animate__fadeIn');
            }, 500);
        }
        statusPercentage.textContent = `${percent}%`;
        
        if (statusMessage.textContent !== message) {
            statusMessage.classList.add('animate__animated', 'animate__fadeIn');
            setTimeout(() => {
                statusMessage.classList.remove('animate__animated', 'animate__fadeIn');
            }, 500);
        }
        statusMessage.textContent = message;
        
        // Update color based on progress
        if (percent < 25) {
            progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated bg-info';
        } else if (percent < 50) {
            progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated bg-primary';
        } else if (percent < 75) {
            progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated bg-warning';
        } else {
            progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated bg-success';
        }
    }

    // Function to reset form
    function resetForm(hideProcessingCard = true) {
        // Reset upload button
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Upload and Process';
        
        // Optionally hide processing card
        if (hideProcessingCard) {
            // Hide with animation
            processingCard.style.transition = 'opacity 0.5s ease';
            processingCard.style.opacity = '0';
            setTimeout(() => {
                processingCard.style.display = 'none';
                // Reset progress bar and status
                updateProgress(0, 'Uploading video...');
                downloadBtn.style.display = 'none';
            }, 500);
        }
    }

    // Function to show error
    function showError(message) {
        console.error('Error:', message);
        
        // Format message for display
        let displayMessage = message;
        if (typeof message === 'string' && message.toLowerCase().includes('error')) {
            displayMessage = message;
        } else {
            displayMessage = `<strong>Error:</strong> ${message}`;
        }
        
        showAlert(displayMessage, 'danger');
        
        // Hide download button
        downloadBtn.style.display = 'none';
    }
    
    // Function to show alert
    function showAlert(message, type, autoDismiss = true) {
        // Create alert element with animation
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            <div class="d-flex">
                <div class="me-3">
                    ${getAlertIcon(type)}
                </div>
                <div>
                    ${message}
                </div>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        // Add animation classes
        alertDiv.style.opacity = '0';
        alertDiv.style.transform = 'translateY(-20px)';
        alertDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        // Insert alert before the processing card
        const insertPoint = processingCard.style.display !== 'none' ? processingCard : uploadForm;
        insertPoint.parentNode.insertBefore(alertDiv, insertPoint);
        
        // Trigger animation
        setTimeout(() => {
            alertDiv.style.opacity = '1';
            alertDiv.style.transform = 'translateY(0)';
        }, 10);
        
        // Auto dismiss after 10 seconds
        if (autoDismiss) {
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    // Fade out
                    alertDiv.style.opacity = '0';
                    alertDiv.style.transform = 'translateY(-20px)';
                    setTimeout(() => {
                        if (alertDiv.parentNode) {
                            alertDiv.remove();
                        }
                    }, 300);
                }
            }, 10000);
        }
    }
    
    // Function to get appropriate icon for alert type
    function getAlertIcon(type) {
        switch(type) {
            case 'success':
                return '<i class="fas fa-check-circle fs-4"></i>';
            case 'danger':
                return '<i class="fas fa-exclamation-triangle fs-4"></i>';
            case 'warning':
                return '<i class="fas fa-exclamation-circle fs-4"></i>';
            case 'info':
                return '<i class="fas fa-info-circle fs-4"></i>';
            default:
                return '<i class="fas fa-info-circle fs-4"></i>';
        }
    }
    
    // Check for RTL support
    function updateRTLSupport() {
        const isRTL = document.documentElement.dir === 'rtl';
        if (isRTL) {
            // Update form elements for RTL layout
            const formElements = document.querySelectorAll('.input-group, .form-control, .btn');
            formElements.forEach(el => {
                el.classList.add('rtl-support');
            });
        }
    }
    
    // Initialize tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    
    // Initial RTL check
    updateRTLSupport();
    
    // Listen for direction changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'dir') {
                updateRTLSupport();
            }
        });
    });
    
    observer.observe(document.documentElement, { attributes: true });
});
