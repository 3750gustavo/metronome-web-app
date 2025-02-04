(function() {
    let audioContext;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('Web Audio API is not supported in this browser');
      alert('Sorry, Web Audio API is not supported in this browser. The metronome may not work.');
    }

    const bpmDisplay = document.getElementById('bpmValue');
    const bpmSlider = document.getElementById('bpmSlider');
    const startStopButton = document.getElementById('startStop');
    const soundSelect = document.getElementById('soundSelect');
    const beatIndicator = document.getElementById('beatIndicator');
    const slideshowBtn = document.getElementById('slideshowBtn');
    const slideshowImg = document.getElementById('slideshow');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const aspectRatioSelect = document.getElementById('aspectRatio');
    const customRatioInputs = document.getElementById('customRatioInputs');
    const customWidth = document.getElementById('customWidth');
    const customHeight = document.getElementById('customHeight');
    const maxWidth = document.getElementById('maxWidth');
    const maxHeight = document.getElementById('maxHeight');
    const applySettings = document.getElementById('applySettings');

    let isPlaying = false;
    let intervalId = null;
    let currentSound = 'beep';
    let images = [];
    let currentImageIndex = 0;

    function createOscillator(frequency, type) {
      const oscillator = audioContext.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      return oscillator;
    }

    function ensureAudioContext() {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    }

    function playSound() {
      ensureAudioContext();

      let oscillator;
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.connect(audioContext.destination);

      switch (currentSound) {
        case 'beep':
          oscillator = createOscillator(440, 'sine'); // A4 note
          break;
        case 'woodblock':
          oscillator = createOscillator(800, 'square');
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          break;
        case 'cowbell':
          oscillator = createOscillator(600, 'triangle');
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          break;
      }

      oscillator.connect(gainNode);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);

      beatIndicator.classList.add('active');
      setTimeout(() => beatIndicator.classList.remove('active'), 100);
    }

    function startMetronome() {
      const bpm = bpmSlider.value;
      const intervalMs = 60000 / bpm;

      if (intervalId) clearInterval(intervalId);

      intervalId = setInterval(() => {
        playSound();
        updateSlideshow();
      }, intervalMs);

      isPlaying = true;
      startStopButton.textContent = 'Stop';
    }

    function stopMetronome() {
      if (intervalId) clearInterval(intervalId);
      isPlaying = false;
      startStopButton.textContent = 'Start';
    }

    function resizeImage(file, maxWidth, maxHeight) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }

          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(blob);
          }, file.type);
        };
        img.src = URL.createObjectURL(file);
      });
    }

    async function updateSlideshow() {
      if (images.length === 0) return;

      currentImageIndex = (currentImageIndex + 1) % images.length;
      const currentImage = images[currentImageIndex];

      const maxWidthValue = parseInt(maxWidth.value);
      const maxHeightValue = parseInt(maxHeight.value);

      try {
        const resizedImage = await resizeImage(currentImage, maxWidthValue, maxHeightValue);
        slideshowImg.src = URL.createObjectURL(resizedImage);
      } catch (error) {
        console.error('Error resizing image:', error);
        slideshowImg.src = URL.createObjectURL(currentImage);
      }
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    function updateImageSettings() {
      const container = document.querySelector('.slideshow-container');
      const img = document.getElementById('slideshow');

      let aspectRatio;
      if (aspectRatioSelect.value === 'custom') {
        aspectRatio = customWidth.value / customHeight.value;
      } else {
        const [width, height] = aspectRatioSelect.value.split(':').map(Number);
        aspectRatio = width / height;
      }

      const paddingBottom = (1 / aspectRatio) * 100;
      container.style.paddingBottom = `${paddingBottom}%`;

      img.style.maxWidth = `${maxWidth.value}px`;
      img.style.maxHeight = `${maxHeight.value}px`;

      if (images.length > 0) {
        updateSlideshow();
      }
    }

    bpmSlider.addEventListener('input', () => {
      const bpm = bpmSlider.value;
      bpmDisplay.textContent = bpm;
      if (isPlaying) startMetronome();
    });

    startStopButton.addEventListener('click', () => {
      if (isPlaying) {
        stopMetronome();
      } else {
        startMetronome();
      }
    });

    soundSelect.addEventListener('change', (e) => {
      currentSound = e.target.value;
    });

    slideshowBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*';
      input.onchange = (e) => {
        images = Array.from(e.target.files);
        if (images.length > 0) {
          updateSlideshow();
        }
      };
      input.click();
    });

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    aspectRatioSelect.addEventListener('change', () => {
      customRatioInputs.style.display = aspectRatioSelect.value === 'custom' ? 'block' : 'none';
    });

    applySettings.addEventListener('click', updateImageSettings);

    // Call this function on page load to set initial values
    updateImageSettings();
  })();