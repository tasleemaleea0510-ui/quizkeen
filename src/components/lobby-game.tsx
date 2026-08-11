"use client";
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createBrowserClient } from "@supabase/ssr";

const COLORS = [0x6366f1, 0xef4444, 0x22c55e, 0xeab308, 0xec4899, 0x06b6d4, 0xf97316, 0xa855f7, 0x14b8a6, 0xf43f5e];
const WORLD_END = 132000;
const RUN_SPEED = 220;

function colorIndexFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % COLORS.length;
}

function cssColor(c: number): string {
  return "#" + c.toString(16).padStart(6, "0");
}

export default function LobbyGame({ pin, username }: { pin: string; username: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const myColor = colorIndexFor(username);
    const channel = supabase.channel(`lobby-${pin}`);

    class LobbyScene extends Phaser.Scene {
      player!: Phaser.Physics.Arcade.Sprite;
      obstacles!: Phaser.Physics.Arcade.Group;
      others: Record<string, Phaser.Physics.Arcade.Sprite> = {};
      otherLabels: Record<string, Phaser.GameObjects.Text> = {};
      progress: Record<string, number> = {};
      myLabel!: Phaser.GameObjects.Text;
      boardText!: Phaser.GameObjects.Text;
      keys: any = null;
      wasd: any = null;
      nextSpawnX = 900;
      finished = false;
      trailG!: Phaser.GameObjects.Graphics;
      trail: { x: number; y: number }[] = [];
      lastDust = 0;

      constructor() {
        super("LobbyScene");
      }

      preload() {
        const g = this.add.graphics();
        COLORS.forEach((c, i) => {
          g.clear();
          g.fillStyle(c, 0.3).fillRect(0, 0, 48, 48);
          g.fillStyle(c, 1).fillRect(6, 6, 36, 36);
          g.fillStyle(0xffffff, 1).fillRect(25, 16, 7, 10).fillRect(35, 16, 7, 10);
          g.fillStyle(0x0f172a, 1).fillRect(28, 19, 3, 5).fillRect(38, 19, 3, 5);
          g.generateTexture(`player-${i}`, 48, 48);
        });
        g.clear();
        g.fillStyle(0xef4444, 0.35).fillTriangle(0, 56, 20, 0, 40, 56);
        g.fillStyle(0xef4444, 1).fillTriangle(6, 56, 20, 8, 34, 56);
        g.fillStyle(0xfecaca, 1).fillTriangle(17, 14, 20, 8, 23, 14);
        g.generateTexture("obstacle", 40, 56);
        g.clear();
        g.fillStyle(0x22d3ee, 1).fillRect(0, 0, 800, 4);
        g.fillStyle(0x0f172a, 1).fillRect(0, 4, 800, 24);
        g.fillStyle(0x164e63, 1);
        for (let gx = 0; gx < 800; gx += 40) g.fillRect(gx, 4, 2, 24);
        g.generateTexture("ground", 800, 28);
        g.clear();
        g.fillGradientStyle(0x1e1b4b, 0x1e1b4b, 0x6d28d9, 0x6d28d9);
        g.fillRect(0, 0, 2, 150);
        g.fillGradientStyle(0x6d28d9, 0x6d28d9, 0xdb2777, 0xdb2777);
        g.fillRect(0, 150, 2, 150);
        g.generateTexture("sky", 2, 300);
        g.clear();
        g.fillStyle(0xffffff, 1).fillCircle(3, 3, 3);
        g.generateTexture("dot", 6, 6);
        g.clear();
        g.fillStyle(0xfbbf24, 1);
        for (let y = 0; y < 160; y += 4) {
          const r = Math.sqrt(Math.max(0, 80 * 80 - (y - 80) * (y - 80)));
          const gap = y > 90 && (y - 90) % 16 < 6;
          if (!gap && r > 0) g.fillRect(80 - r, y, r * 2, 4);
        }
        g.generateTexture("sun", 160, 160);
        g.clear();
        let x = 0;
        g.fillStyle(0x312e81, 1);
        while (x < 400) {
          const w = 60 + Math.random() * 80;
          const h = 40 + Math.random() * 90;
          g.fillTriangle(x, 140, x + w / 2, 140 - h, x + w, 140);
          x += w * 0.7;
        }
        g.generateTexture("mFar", 400, 140);
        g.clear();
        x = 0;
        g.fillStyle(0x1e1b4b, 1);
        while (x < 400) {
          const w = 80 + Math.random() * 90;
          const h = 30 + Math.random() * 70;
          g.fillTriangle(x, 110, x + w / 2, 110 - h, x + w, 110);
          x += w * 0.6;
        }
        g.generateTexture("mNear", 400, 110);
        g.clear();
        g.fillStyle(0xffffff, 0.8);
        for (let i = 0; i < 40; i++) {
          g.fillCircle(Math.random() * 400, Math.random() * 220, Math.random() * 1.5 + 0.5);
        }
        g.generateTexture("stars", 400, 300);
        g.clear();
        for (let y = 0; y < 300; y += 20) {
          for (let xx = 0; xx < 60; xx += 20) {
            g.fillStyle((xx / 20 + y / 20) % 2 === 0 ? 0xffffff : 0x111111, 1).fillRect(xx, y, 20, 20);
          }
        }
        g.generateTexture("finish", 60, 300);
        g.destroy();
      }

      create() {
        const sky = this.add.image(400, 150, "sky").setScrollFactor(0).setDepth(0);
        sky.setDisplaySize(800, 300);
        this.add.tileSprite(400, 150, 800, 300, "stars").setScrollFactor(0.1).setDepth(1);
        this.add.image(620, 180, "sun").setScrollFactor(0).setDepth(2).setAlpha(0.9);
        this.add.tileSprite(400, 204, 900, 140, "mFar").setScrollFactor(0.25).setDepth(3);
        this.add.tileSprite(400, 219, 900, 110, "mNear").setScrollFactor(0.45).setDepth(4);

        this.physics.world.setBounds(0, 0, WORLD_END + 800, 300);

        const ground = this.physics.add.staticImage((WORLD_END + 800) / 2, 288, "ground");
        ground.setScale((WORLD_END + 1600) / 800, 1);
        ground.refreshBody();
        ground.setDepth(5);

        this.player = this.physics.add.sprite(120, 200, `player-${myColor}`);
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(8);

        this.myLabel = this.add.text(120, 160, username, {
          fontSize: "13px",
          color: cssColor(COLORS[myColor]),
          fontStyle: "bold",
        }).setOrigin(0.5).setDepth(9);

        this.trailG = this.add.graphics().setDepth(7);
        this.obstacles = this.physics.add.group();

        this.physics.add.collider(this.player, ground);

        this.physics.add.overlap(this.player, this.obstacles, () => {
          if (this.finished) return;
          this.burst(this.player.x, this.player.y, 0xef4444, 14);
          this.player.setVelocity(0, 0);
          this.player.setPosition(120, 200);
          this.trail = [];
        });

        const finish = this.physics.add.staticImage(WORLD_END, 150, "finish");
        finish.setDepth(5);
        this.add.text(WORLD_END, 30, "🏁 FINISH", {
          fontSize: "22px",
          color: "#ffffff",
          fontStyle: "bold",
        }).setOrigin(0.5).setDepth(9);
        this.physics.add.overlap(this.player, finish, () => {
          if (this.finished) return;
          this.finished = true;
          const t = Math.floor(this.time.now / 1000);
          const mm = Math.floor(t / 60);
          const ss = (t % 60).toString().padStart(2, "0");
          this.burst(this.player.x, this.player.y - 20, 0xfbbf24, 24);
          this.add.text(400, 120, `🏁 YOU FINISHED IN ${mm}:${ss}!`, {
            fontSize: "28px",
            color: "#ffffff",
            fontStyle: "bold",
          }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
        });

        if (this.input.keyboard) {
          this.input.keyboard.addCapture(["SPACE", "UP", "RIGHT"]);
          this.keys = this.input.keyboard.createCursorKeys();
          this.wasd = this.input.keyboard.addKeys("D");
          this.input.keyboard.on("keydown-SPACE", this.jump);
          this.input.keyboard.on("keydown-UP", this.jump);
        }
        this.input.on("pointerdown", this.jump);

        const hint = this.add.text(400, 50, "→ / D = run • SPACE = jump • 💥 spike = back to start!", {
          fontSize: "14px",
          color: "#ffffff",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
        this.time.delayedCall(6000, () => hint.destroy());

        this.boardText = this.add.text(12, 12, "", {
          fontSize: "14px",
          color: "#ffffff",
          fontStyle: "bold",
          backgroundColor: "#00000088",
          padding: { x: 8, y: 6 },
        }).setScrollFactor(0).setDepth(20);

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        this.time.addEvent({
          delay: 100,
          loop: true,
          callback: () => {
            this.progress[username] = this.player.x;
            channel.send({
              type: "broadcast",
              event: "pos",
              payload: { name: username, x: this.player.x, y: this.player.y, c: myColor },
            });
          },
        });

        this.time.addEvent({
          delay: 500,
          loop: true,
          callback: () => {
            const medals = ["🥇", "", "🥉"];
            const lines = Object.entries(this.progress)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([n, x], i) => `${medals[i]} ${n} ${Math.min(100, Math.floor((x / WORLD_END) * 100))}%`);
            this.boardText.setText(lines.join("\n"));
          },
        });
      }

      jump = () => {
        if (this.player.body && this.player.body.touching.down) {
          this.player.setVelocityY(-430);
          this.burst(this.player.x, this.player.y + 20, 0xffffff, 6);
        }
      };

      burst(x: number, y: number, color: number, n: number) {
        for (let i = 0; i < n; i++) {
          const p = this.physics.add.sprite(x, y, "dot") as Phaser.Physics.Arcade.Sprite;
          p.setTint(color);
          p.setDepth(9);
          const b = p.body as Phaser.Physics.Arcade.Body;
          if (b) {
            b.setAllowGravity(false);
            const a = Math.random() * Math.PI * 2;
            const s = 60 + Math.random() * 160;
            b.setVelocity(Math.cos(a) * s, Math.sin(a) * s);
          }
          this.tweens.add({ targets: p, alpha: 0, scale: 0.3, duration: 400, onComplete: () => p.destroy() });
        }
      }

      update() {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        let vx = 0;
        if (this.keys?.right?.isDown || this.wasd?.D?.isDown) vx = RUN_SPEED;
        body.setVelocityX(vx);

        if (vx > 0 && body.touching.down && this.time.now - this.lastDust > 120) {
          this.lastDust = this.time.now;
          const d = this.physics.add.sprite(this.player.x - 20, this.player.y + 20, "dot") as Phaser.Physics.Arcade.Sprite;
          d.setTint(0x94a3b8);
          const db = d.body as Phaser.Physics.Arcade.Body;
          if (db) {
            db.setAllowGravity(false);
            db.setVelocity(-60 - Math.random() * 40, -30 - Math.random() * 40);
          }
          this.tweens.add({ targets: d, alpha: 0, duration: 350, onComplete: () => d.destroy() });
        }

        while (this.nextSpawnX < this.player.x + 1200 && this.nextSpawnX < WORLD_END - 400) {
          const ob = this.obstacles.create(this.nextSpawnX, 246, "obstacle") as Phaser.Physics.Arcade.Sprite;
          ob.setDepth(6);
          const b = ob.body as Phaser.Physics.Arcade.Body;
          if (b) {
            b.setAllowGravity(false);
            b.setVelocityX(0);
          }
          this.nextSpawnX += 350 + Math.random() * 550;
        }

        this.obstacles.getChildren().forEach((child) => {
          const ob = child as Phaser.Physics.Arcade.Sprite;
          if (ob.x < this.player.x - 1000) ob.destroy();
        });

        this.trail.push({ x: this.player.x, y: this.player.y });
        if (this.trail.length > 25) this.trail.shift();
        this.trailG.clear();
        for (let i = 1; i < this.trail.length; i++) {
          const a = i / this.trail.length;
          this.trailG.lineStyle(3, COLORS[myColor], a * 0.5);
          this.trailG.beginPath();
          this.trailG.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
          this.trailG.lineTo(this.trail[i].x, this.trail[i].y);
          this.trailG.strokePath();
        }

        this.myLabel.setPosition(this.player.x, this.player.y - 36);
      }
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current,
      width: 800,
      height: 300,
      physics: { default: "arcade", arcade: { gravity: { x: 0, y: 900 } } },
      scene: LobbyScene,
    });

    channel
      .on("broadcast", { event: "pos" }, (msg) => {
        const { name, x, y, c } = msg.payload as { name: string; x: number; y: number; c: number };
        if (name === username) return;
        const scene = game.scene.getScene("LobbyScene") as LobbyScene;
        if (!scene || !scene.player) return;
        scene.progress[name] = x;
        let s = scene.others[name];
        if (!s) {
          s = scene.physics.add.sprite(x, y, `player-${c}`);
          s.setDepth(8);
          const sb = s.body as Phaser.Physics.Arcade.Body;
          if (sb) sb.setAllowGravity(false);
          scene.others[name] = s;
          scene.otherLabels[name] = scene.add.text(x, y - 36, name, {
            fontSize: "13px",
            color: cssColor(COLORS[c]),
            fontStyle: "bold",
          }).setOrigin(0.5).setDepth(9);
        }
        s.setPosition(x, y);
        scene.otherLabels[name]?.setPosition(x, y - 36);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      game.destroy(true);
    };
  }, [pin, username]);

  return <div ref={ref} className="w-full overflow-hidden rounded-xl border border-slate-800" />;
}