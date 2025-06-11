const fileInput = document.getElementById("audioFile");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let audio = new Audio();
let audioCtx, analyser, source;

const minBarHeight = 20;

// 动态阈值（在一定范围内随时间变化）
function getDynamicThreshold(time) {
    return minBarHeight + 10 * Math.abs(Math.sin(time * 0.001));
}

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.play();
    if (!audioCtx) setupAudio();
    else {
        source.disconnect();
        source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
    }
});

function setupAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    visualize();
}

let particles = [];
function createParticle(x, y, color) {
    particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 60,
        color
    });
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 60;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        if (p.life <= 0) particles.splice(i, 1);
    }
    ctx.globalAlpha = 1.0;
}

function visualize() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const radius = 150;
        const bars = bufferLength;
        const time = Date.now() * 0.02;

        const maxVal = Math.max(...dataArray);
        const minVal = Math.min(...dataArray);

        const dynamicThreshold = getDynamicThreshold(time);
        let belowThresholdCount = 0;

        for (let i = 0; i < bars; i++) {
            const angle = (i / bars) * 2 * Math.PI;
            const norm = (dataArray[i] - minVal) / (maxVal - minVal + 1e-6);
            let barHeight = norm * 120 + minBarHeight; // 保证最小有minBarHeight
            if (i >= bars * 0.75 && barHeight < dynamicThreshold) {
                barHeight = minBarHeight; // 动态去掉短条
                belowThresholdCount++;
                if (belowThresholdCount > 1) continue;
            }
            else belowThresholdCount = 0;

            const x1 = cx + Math.cos(angle) * radius;
            const y1 = cy + Math.sin(angle) * radius;
            const x2 = cx + Math.cos(angle) * (radius + barHeight);
            const y2 = cy + Math.sin(angle) * (radius + barHeight);

            const hue = (time + i * 3) % 360;
            const color = `hsl(${hue}, 100%, 50%)`;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            if (norm > 0.5) createParticle(x2, y2, color);
        }

        drawParticles();
    }

    draw();
}
