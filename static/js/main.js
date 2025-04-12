document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const uploadForm = document.getElementById('uploadForm');
    const uploadBtn = document.getElementById('uploadBtn');
    const processingCard = document.getElementById('processingCard');
    const progressBar = document.getElementById('progressBar');
    const statusMessage = document.getElementById('statusMessage');
    const statusPercentage = document.getElementById('statusPercentage');
    const downloadBtn = document.getElementById('downloadBtn');

    // Current job ID and polling interval
    let currentJobId = null;
    let pollingInterval = null;

    // Form validation
    uploadForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        if (!uploadForm.checkValidity()) {
            event.stopPropagation();
            uploadForm.classList.add('was-validated');
            return;
        }
        
        // Submit the form
        uploadVideo();
    });

    // Function to upload video
    function uploadVideo() {
        // Get form data
        const formData = new FormData(uploadForm);
        
        // Disable upload button and show loading state
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Uploading...';
        
        // Show processing card
        processingCard.style.display = 'block';
        
        // Reset progress
        updateProgress(0, 'Uploading video...');
        
        // Send AJAX request
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Store job ID
                currentJobId = data.job_id;
                
                // Start polling for job status
                startPolling(currentJobId);
            } else {
                // Handle error
                showError(data.message || 'Error uploading video');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Error uploading video. Please try again.');
        });
    }

    // Function to start polling for job status
    function startPolling(jobId) {
        // Clear any existing interval
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        
        // Set polling interval (check every 2 seconds)
        pollingInterval = setInterval(() => {
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
                    
                    // Enable download button
                    downloadBtn.style.display = 'block';
                    downloadBtn.href = `/download/${jobId}`;
                    
                    // Reset upload button
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Upload and Process';
                    
                    // Show success message
                    showAlert('Success! Your video has been dubbed. Click the download button to get your file.', 'success');
                } else if (data.status === 'error') {
                    // Stop polling
                    clearInterval(pollingInterval);
                    
                    // Show error
                    showError(data.message);
                    
                    // Reset upload button
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Upload and Process';
                }
            })
            .catch(error => {
                console.error('Error checking job status:', error);
                // Don't stop polling on temporary errors
            });
    }

    // Function to update progress UI
    function updateProgress(percent, message) {
        progressBar.style.width = `${percent}%`;
        progressBar.setAttribute('aria-valuenow', percent);
        statusPercentage.textContent = `${percent}%`;
        statusMessage.textContent = message;
        
        // Update color based on progress
        if (percent < 25) {
            progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated bg-info';
        } else if (percent < 75) {
            progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated bg-warning';
        } else {
            progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated bg-success';
        }
    }

    // Function to show error
    function showError(message) {
        showAlert(message, 'danger');
        // Hide download button
        downloadBtn.style.display = 'none';
    }
    
    // Function to show alert
    function showAlert(message, type) {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Insert alert before the processing card
        processingCard.parentNode.insertBefore(alertDiv, processingCard);
        
        // Auto dismiss after 10 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 10000);
    }
});
