import React, { useEffect, useRef } from 'react';

/**
 * NeuralNetworkBackground
 * High-performance, full-viewport HTML5 Canvas neural network animation.
 * Features:
 *  - Drifting synaptic nodes with gentle bounded velocities
 *  - Distance-weighted proximity lines with electric cyan/violet/purple tints
 *  - Synaptic signal firing pulses travelling along connections
 *  - Subtle interactive mouse avoidance/repulsion
 *  - Auto-pause on tab blur / document hidden
 *  - Responsive node scaling for mobile devices
 *  - pointer-events: none to avoid blocking UI interactions
 */
export default function NeuralNetworkBackground({ opacity = 0.5 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId;
    let isTabActive = true;

    // Window dimensions
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Responsive node count
    const isMobile = width < 768;
    const nodeCount = isMobile ? 42 : Math.min(110, Math.floor((width * height) / 13000));
    const maxDistance = isMobile ? 120 : 165;
    const mouseRadius = 150;

    // Mouse coordinates (global window tracking)
    const mouse = { x: -9999, y: -9999, active: false };

    // Node palette: brand teal, warm amber, slate-blue, vibrant violet
    const colors = [
      { r: 79, g: 163, b: 147 },   // #4fa393 (brand teal)
      { r: 227, g: 179, b: 65 },   // #e3b341 (warm amber)
      { r: 122, g: 162, b: 247 },  // #7aa2f7 (slate blue)
      { r: 168, g: 85, b: 247 },   // #a855f7 (vibrant violet)
      { r: 94, g: 234, b: 212 },   // #5eead4 (bright cyan/teal pulse)
    ];

    // Synaptic nodes
    class Node {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = (Math.random() - 0.5) * 0.45;
        this.radius = Math.random() * 2.0 + 1.5;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.baseAlpha = Math.random() * 0.35 + 0.65;
      }

      update() {
        // Move with slow, smooth drift
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around boundaries smoothly
        if (this.x < -20) this.x = width + 20;
        else if (this.x > width + 20) this.x = -20;
        if (this.y < -20) this.y = height + 20;
        else if (this.y > height + 20) this.y = -20;

        // Subtle mouse repulsion
        if (mouse.active) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouseRadius && dist > 0) {
            const force = (mouseRadius - dist) / mouseRadius;
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * force * 1.2;
            this.y += Math.sin(angle) * force * 1.2;
          }
        }
      }

      draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.baseAlpha})`;
        ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }
    }

    // Synaptic signal pulses travelling between connected nodes
    class Pulse {
      constructor(fromNode, toNode) {
        this.from = fromNode;
        this.to = toNode;
        this.progress = 0;
        this.speed = Math.random() * 0.015 + 0.008; // 1-2 seconds traverse
        this.color = fromNode.color;
        this.size = Math.random() * 2 + 2;
        this.alive = true;
      }

      update() {
        this.progress += this.speed;
        if (this.progress >= 1) {
          this.alive = false;
        }
      }

      draw() {
        if (!this.alive) return;
        const currX = this.from.x + (this.to.x - this.from.x) * this.progress;
        const currY = this.from.y + (this.to.y - this.from.y) * this.progress;

        ctx.save();
        ctx.beginPath();
        ctx.arc(currX, currY, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.95)`;
        ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 1)`;
        ctx.shadowBlur = 12;
        ctx.fill();

        // Trail glow
        ctx.beginPath();
        const trailProgress = Math.max(0, this.progress - 0.08);
        const trailX = this.from.x + (this.to.x - this.from.x) * trailProgress;
        const trailY = this.from.y + (this.to.y - this.from.y) * trailProgress;
        ctx.moveTo(currX, currY);
        ctx.lineTo(trailX, trailY);
        ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.6)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Initialize nodes
    const nodes = Array.from({ length: nodeCount }, () => new Node());
    const pulses = [];
    let lastPulseTime = performance.now();

    // Resize handler
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse handlers
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Visibility / Tab blur handling to save CPU
    const handleVisibilityChange = () => {
      isTabActive = !document.hidden;
      if (isTabActive) {
        lastPulseTime = performance.now();
        requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', () => { isTabActive = false; });
    window.addEventListener('focus', () => {
      if (!isTabActive) {
        isTabActive = true;
        requestAnimationFrame(render);
      }
    });

    // Main animation loop
    const render = (now) => {
      if (!isTabActive) return;

      ctx.clearRect(0, 0, width, height);

      // Randomly spawn pulses along nearby connected nodes
      if (now - lastPulseTime > 1600 && pulses.length < 8) {
        // Pick random node
        const sourceIndex = Math.floor(Math.random() * nodes.length);
        const sourceNode = nodes[sourceIndex];

        // Find nearest connected neighbor
        let bestTarget = null;
        let bestDist = maxDistance;
        for (let i = 0; i < nodes.length; i++) {
          if (i === sourceIndex) continue;
          const d = Math.hypot(nodes[i].x - sourceNode.x, nodes[i].y - sourceNode.y);
          if (d < bestDist && d > 30) {
            bestDist = d;
            bestTarget = nodes[i];
          }
        }

        if (bestTarget) {
          pulses.push(new Pulse(sourceNode, bestTarget));
          lastPulseTime = now;
        }
      }

      // Draw connection lines between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot(b.x - a.x, b.y - a.y);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.55;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);

            // Vibrant gradient along the line between the two node colors
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, `rgba(${a.color.r}, ${a.color.g}, ${a.color.b}, ${alpha})`);
            grad.addColorStop(1, `rgba(${b.color.r}, ${b.color.g}, ${b.color.b}, ${alpha})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }

      // Update & draw pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pulse = pulses[i];
        pulse.update();
        pulse.draw();
        if (!pulse.alive) {
          pulses.splice(i, 1);
        }
      }

      // Update & draw nodes
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].update();
        nodes[i].draw();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
      style={{ opacity }}
    >
      {/* Background ambient radial gradients for esports depth */}
      <div 
        className="absolute inset-0 bg-radial-vignette pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 20%, rgba(0, 212, 255, 0.08) 0%, transparent 65%), radial-gradient(circle at 85% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 60%)'
        }}
      />
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  );
}
