/**
 * 3D Effects for VideoDubber.AI
 * Implements amazing 3D animations and particle effects
 */

// Initialize particle background
document.addEventListener('DOMContentLoaded', function() {
    // Create particle background
    initParticles();
    
    // Initialize 3D effects
    init3DEffects();
    
    // Add hover 3D effect to cards
    initCardHoverEffects();
});

// Particle background
function initParticles() {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            "particles": {
                "number": {
                    "value": 80,
                    "density": {
                        "enable": true,
                        "value_area": 800
                    }
                },
                "color": {
                    "value": "#0d6efd"
                },
                "shape": {
                    "type": "circle",
                    "stroke": {
                        "width": 0,
                        "color": "#000000"
                    },
                    "polygon": {
                        "nb_sides": 5
                    }
                },
                "opacity": {
                    "value": 0.5,
                    "random": false,
                    "anim": {
                        "enable": false,
                        "speed": 1,
                        "opacity_min": 0.1,
                        "sync": false
                    }
                },
                "size": {
                    "value": 3,
                    "random": true,
                    "anim": {
                        "enable": false,
                        "speed": 40,
                        "size_min": 0.1,
                        "sync": false
                    }
                },
                "line_linked": {
                    "enable": true,
                    "distance": 150,
                    "color": "#0d6efd",
                    "opacity": 0.4,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 2,
                    "direction": "none",
                    "random": false,
                    "straight": false,
                    "out_mode": "out",
                    "bounce": false,
                    "attract": {
                        "enable": false,
                        "rotateX": 600,
                        "rotateY": 1200
                    }
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": {
                        "enable": true,
                        "mode": "grab"
                    },
                    "onclick": {
                        "enable": true,
                        "mode": "push"
                    },
                    "resize": true
                },
                "modes": {
                    "grab": {
                        "distance": 140,
                        "line_linked": {
                            "opacity": 1
                        }
                    },
                    "bubble": {
                        "distance": 400,
                        "size": 40,
                        "duration": 2,
                        "opacity": 8,
                        "speed": 3
                    },
                    "repulse": {
                        "distance": 200,
                        "duration": 0.4
                    },
                    "push": {
                        "particles_nb": 4
                    },
                    "remove": {
                        "particles_nb": 2
                    }
                }
            },
            "retina_detect": true
        });
    }
}

// 3D card hover effects
function initCardHoverEffects() {
    // Add 3D tilt effect to cards
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        // Skip processing cards without hover effect
        if (card.classList.contains('no-tilt')) {
            return;
        }
        
        card.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element
            const y = e.clientY - rect.top;  // y position within the element
            
            const width = rect.width;
            const height = rect.height;
            
            // Calculate rotation based on mouse position
            // Convert to percentage
            const xPercent = x / width;
            const yPercent = y / height;
            
            // Calculate rotation (maximum 10 degrees)
            const rotateY = (xPercent - 0.5) * 20; // -10 to 10 degrees
            const rotateX = (yPercent - 0.5) * -20; // 10 to -10 degrees (inverted)
            
            // Apply transform
            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            
            // Add glow effect based on mouse position
            const glowX = xPercent * 100;
            const glowY = yPercent * 100;
            
            // Apply glow
            this.style.background = `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(13, 110, 253, 0.2), transparent 50%)`;
            
            // Make sure shadows follow the tilt
            const shadowX = rotateY / 2;
            const shadowY = rotateX / -2;
            
            this.style.boxShadow = `${shadowX}px ${shadowY}px 20px rgba(0, 0, 0, 0.3)`;
        });
        
        // Reset on mouse leave
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            this.style.background = '';
            this.style.boxShadow = '';
        });
    });
}

// Three.js 3D effects
function init3DEffects() {
    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded, skipping 3D effects');
        return;
    }
    
    // Create a container for the 3D hero effect
    const container = document.querySelector('.col-lg-6.bg-primary');
    
    if (!container) {
        return;
    }
    
    // Create overlay div for ThreeJS
    const threeJsOverlay = document.createElement('div');
    threeJsOverlay.id = 'three-js-overlay';
    threeJsOverlay.style.position = 'absolute';
    threeJsOverlay.style.top = '0';
    threeJsOverlay.style.left = '0';
    threeJsOverlay.style.width = '100%';
    threeJsOverlay.style.height = '100%';
    threeJsOverlay.style.zIndex = '0';
    threeJsOverlay.style.opacity = '0.8';
    threeJsOverlay.style.pointerEvents = 'none';
    
    // Position the container relatively to allow absolute positioning of the overlay
    container.style.position = 'relative';
    
    // Add overlay to container
    container.insertBefore(threeJsOverlay, container.firstChild);
    
    // Set up Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setClearColor(0x000000, 0);
    threeJsOverlay.appendChild(renderer.domElement);
    
    // Create a group for the objects
    const group = new THREE.Group();
    scene.add(group);
    
    // Create floating icons representing video translation features
    const iconGeometry = new THREE.IcosahedronGeometry(0.5, 0);
    
    // Create different materials
    const materials = [
        new THREE.MeshPhongMaterial({ color: 0x0d6efd, flatShading: true }), // Blue for audio
        new THREE.MeshPhongMaterial({ color: 0xffc107, flatShading: true }), // Yellow for translation
        new THREE.MeshPhongMaterial({ color: 0x198754, flatShading: true }), // Green for speech
        new THREE.MeshPhongMaterial({ color: 0xdc3545, flatShading: true })  // Red for video
    ];
    
    // Create several floating icons
    const icons = [];
    
    for (let i = 0; i < 15; i++) {
        const mesh = new THREE.Mesh(iconGeometry, materials[i % materials.length]);
        
        // Random positions within a sphere
        const radius = 4 + Math.random() * 4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
        mesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
        mesh.position.z = radius * Math.cos(phi);
        
        // Random scale
        const scale = 0.2 + Math.random() * 0.3;
        mesh.scale.set(scale, scale, scale);
        
        // Add to group
        group.add(mesh);
        icons.push({
            mesh: mesh,
            rotationSpeed: 0.005 + Math.random() * 0.01,
            orbitSpeed: 0.005 + Math.random() * 0.01,
            radius: radius,
            theta: theta,
            phi: phi
        });
    }
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    // Position camera
    camera.position.z = 6;
    
    // Add mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', function(event) {
        // Calculate mouse position relative to the center of the container
        const rect = container.getBoundingClientRect();
        mouseX = ((event.clientX - rect.left) / container.offsetWidth) * 2 - 1;
        mouseY = -((event.clientY - rect.top) / container.offsetHeight) * 2 + 1;
    });
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Rotate group based on mouse position
        group.rotation.y += 0.003;
        group.rotation.x = mouseY * 0.3;
        group.rotation.y = mouseX * 0.3;
        
        // Animate each icon
        icons.forEach(icon => {
            // Rotate each icon
            icon.mesh.rotation.x += icon.rotationSpeed;
            icon.mesh.rotation.y += icon.rotationSpeed * 1.5;
            
            // Make the icons orbit
            icon.theta += icon.orbitSpeed;
            icon.mesh.position.x = icon.radius * Math.sin(icon.phi) * Math.cos(icon.theta);
            icon.mesh.position.y = icon.radius * Math.sin(icon.phi) * Math.sin(icon.theta);
            icon.mesh.position.z = icon.radius * Math.cos(icon.phi);
        });
        
        renderer.render(scene, camera);
    }
    
    // Start animation
    animate();
    
    // Handle window resize
    window.addEventListener('resize', function() {
        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
    });
}

// Add parallax scrolling effect
document.addEventListener('scroll', function() {
    const scrollPosition = window.scrollY;
    
    // Apply parallax effect to cards
    document.querySelectorAll('.how-it-works-card').forEach((card, index) => {
        const speed = 0.05 + (index * 0.02);
        card.style.transform = `translateY(${scrollPosition * speed}px)`;
    });
    
    // Add floating effect to info cards
    document.querySelectorAll('.d-flex .fas').forEach(icon => {
        const speed = 0.03;
        const yPos = Math.sin(scrollPosition * 0.01) * 10;
        icon.style.transform = `translateY(${yPos}px)`;
    });
});