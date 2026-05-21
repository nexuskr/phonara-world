// public/workers/confettiWorker.js
self.onmessage = function (e) {
  const { type, config, canvas } = e.data;

  if (type === "init" && canvas) {
    self.canvas = canvas;
    self.ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    self.particles = [];
    self.running = true;
    self.animate();
  }

  if (type === "fire") {
    createBurst(config || {});
  }

  if (type === "stop") {
    self.running = false;
    if (self.requestId) cancelAnimationFrame(self.requestId);
  }
};

function createBurst(config) {
  const count = Math.floor(config.particleCount || 60);
  for (let i = 0; i < count; i++) {
    self.particles.push({
      x: config.originX || Math.random() * self.canvas.width,
      y: config.originY || self.canvas.height * 0.6,
      vx: (Math.random() - 0.5) * (config.spread || 80),
      vy: (Math.random() - 0.5) * 22 - 15,
      life: config.ticks || 200,
      maxLife: config.ticks || 200,
      color: `hsl(${340 + Math.random() * 50}, 100%, 65%)`,
      size: Math.random() * 6 + 3.5,
    });
  }
}

function animate() {
  if (!self.running) return;

  const ctx = self.ctx;
  ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);

  for (let i = self.particles.length - 1; i >= 0; i--) {
    const p = self.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.48;
    p.vx *= 0.982;
    p.vy *= 0.982;
    p.life -= 1;

    if (p.life <= 0) {
      self.particles.splice(i, 1);
      continue;
    }

    const alpha = (p.life / p.maxLife) * 0.95;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  self.requestId = self.requestAnimationFrame(animate);
}