// public/workers/particle-worker.js
let canvas, ctx, particles = [], animationFrame;
let mouse = { x: 0, y: 0 };
let width = 0, height = 0;
let isMobile = false;

self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type === 'init') {
    canvas = payload.canvas;
    ctx = canvas.getContext('2d', { alpha: true });
    isMobile = payload.isMobile;
    width = payload.width;
    height = payload.height;
    canvas.width = width;
    canvas.height = height;

    const count = isMobile ? 45 : 75;
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(createParticle());
    }
    animate();
  }

  if (type === 'resize') {
    width = payload.width;
    height = payload.height;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  if (type === 'mousemove') {
    mouse.x = payload.x;
    mouse.y = payload.y;
  }
};

function createParticle() {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2.2 + 0.6,
    speedX: Math.random() * 0.5 - 0.25,
    speedY: Math.random() * 0.5 - 0.25,
    opacity: Math.random() * 0.45 + 0.15,
    hue: [200, 260, 295, 330][Math.floor(Math.random() * 4)]
  };
}

function animate() {
  ctx.fillStyle = "rgba(10, 10, 15, 0.13)";
  ctx.fillRect(0, 0, width, height);

  particles.forEach(p => {
    // Mouse interaction
    const dx = mouse.x - p.x;
    const dy = mouse.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 160) {
      const force = (160 - dist) / 160;
      p.speedX += (dx / dist) * force * 0.04;
      p.speedY += (dy / dist) * force * 0.04;
    }

    p.x += p.speedX;
    p.y += p.speedY;
    p.speedX *= 0.978;
    p.speedY *= 0.978;
    p.opacity = Math.max(0.08, p.opacity * 0.992);

    // Boundary
    if (p.x < 0 || p.x > width) p.speedX *= -1;
    if (p.y < 0 || p.y > height) p.speedY *= -1;

    // Draw
    ctx.save();
    ctx.fillStyle = `hsla(${p.hue}, 100%, 90%, ${p.opacity})`;
    ctx.shadowBlur = 9;
    ctx.shadowColor = `hsl(${p.hue}, 100%, 72%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  animationFrame = self.requestAnimationFrame(animate);
}