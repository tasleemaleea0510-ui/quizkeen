"use client";
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createBrowserClient } from "@supabase/ssr";

const COLORS = [0x6366f1, 0xef4444, 0x22c55e, 0xeab308, 0xec4899, 0x06b6d4, 0xf97316, 0xa855f7, 0x14b8a6, 0xf43f5e];
const BG_COLORS = ["#0ea5e9", "#22c55e", "#f97316", "#ec4899", "#8b5cf6", "#eab308"];
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

      constructor() {
        super("LobbyScene");
      }

      preload() {
        const g = this.add.graphics();
        COLORS.forEach((c, i) => {
          g.fillStyle(c, 1).fillRect(0, 0, 36, 36).generateTexture(`player-${i}`, 36, 36);
        });
        g.clear();
        g.fillStyle(0xef4444, 1);
        g.beginPath();
        g.moveTo(0, 48);
        g.lineTo(14, 0);
        g.lineTo(28, 48);
        g.closePath();
        g.fillPath();
        g.generateTexture("obstacle", 28, 48);
        g.clear();
        g.fillStyle(0x475569, 1).fillRect(0, 0, 800, 24).generateTexture("ground", 800, 24);
        g.clear();
        for (let y = 0; y < 300; y += 20) {
          for (let x = 0; x < 60; x += 20) {
            g.fillStyle((x / 20 + y / 20) % 2 === 0 ? 0xffffff : 0x111111, 1).fillRect(x, y, 20, 20);
          }
        }
        g.generateTexture("finish", 60, 300);
        g.destroy();
      }

      create() {
        this.cameras.main.setBackgroundColor("#0ea5e9");
        this.physics.world.setBounds(0, 0, WORLD_END + 800, 300);

        const ground = this.physics.add.staticImage((WORLD_END + 800) / 2, 288, "ground");
        ground.setScale((WORLD_END + 1600) / 800, 1);
        ground.refreshBody();

        this.player = this.physics.add.sprite(120, 200, `player-${myColor}`);
        this.player.setCollideWorldBounds(true);

        this.myLabel = this.add.text(120, 160, username, {
          fontSize: "13px",
          color: cssColor(COLORS[myColor]),
          fontStyle: "bold",
        }).setOrigin(0.5);

        this.obstacles = this.physics.add.group();

        this.physics.add.collider(this.player, ground);

        this.physics.add.overlap(this.player, this.obstacles, () => {
          if (this.finished) return;
          this.player.setVelocity(0, 0);
          this.player.setPosition(120, 200);
          this.player.setTint(0xff0000);
          this.time.delayedCall(250, () => this.player.clearTint());
        });

        const finish = this.physics.add.staticImage(WORLD_END, 150, "finish");
        this.physics.add.overlap(this.player, finish, () => {
          if (this.finished) return;
          this.finished = true;
          const t = Math.floor(this.time.now / 1000);
          const mm = Math.floor(t / 60);
          const ss = (t % 60).toString().padStart(2, "0");
          this.add.text(400, 120, `🏁 YOU FINISHED IN ${mm}:${ss}!`, {
            fontSize: "28px",
            color: "#ffffff",
            fontStyle: "bold",
          }).setOrigin(0.5).setScrollFactor(0);
        });

        if (this.input.keyboard) {
          this.input.keyboard.addCapture(["SPACE", "UP", "LEFT", "RIGHT"]);
          this.keys = this.input.keyboard.createCursorKeys();
          this.wasd = this.input.keyboard.addKeys("A,D");
          this.input.keyboard.on("keydown-SPACE", this.jump);
          this.input.keyboard.on("keydown-UP", this.jump);
        }
        this.input.on("pointerdown", this.jump);

        const hint = this.add.text(400, 50, "→ / D = run • SPACE = jump • 💥 spike = back to start!", {
          fontSize: "14px",
          color: "#ffffff",
        }).setOrigin(0.5).setScrollFactor(0);
        this.time.delayedCall(6000, () => hint.destroy());

        this.boardText = this.add.text(12, 12, "", {
          fontSize: "14px",
          color: "#ffffff",
          fontStyle: "bold",
          backgroundColor: "#00000088",
          padding: { x: 8, y: 6 },
        }).setScrollFactor(0);

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
            const medals = ["🥇", "🥈", "🥉"];
            const lines = Object.entries(this.progress)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([n, x], i) => `${medals[i]} ${n} ${Math.min(100, Math.floor((x / WORLD_END) * 100))}%`);
            this.boardText.setText(lines.join("\n"));
          },
        });

        this.time.addEvent({
          delay: 10000,
          loop: true,
          callback: () => {
            const idx = Math.floor(this.time.now / 10000) % BG_COLORS.length;
            this.cameras.main.setBackgroundColor(BG_COLORS[idx]);
          },
        });
      }

      jump = () => {
        if (this.player.body && this.player.body.touching.down) {
          this.player.setVelocityY(-430);
        }
      };

      update() {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        let vx = 0;
        if (this.keys?.right?.isDown || this.wasd?.D?.isDown) vx = RUN_SPEED;
        else if (this.keys?.left?.isDown || this.wasd?.A?.isDown) vx = -RUN_SPEED;
        body.setVelocityX(vx);

        while (this.nextSpawnX < this.player.x + 1200 && this.nextSpawnX < WORLD_END - 400) {
          const ob = this.obstacles.create(this.nextSpawnX, 252, "obstacle") as Phaser.Physics.Arcade.Sprite;
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

        this.myLabel.setPosition(this.player.x, this.player.y - 32);
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
          const sb = s.body as Phaser.Physics.Arcade.Body;
          if (sb) sb.setAllowGravity(false);
          scene.others[name] = s;
          scene.otherLabels[name] = scene.add.text(x, y - 32, name, {
            fontSize: "13px",
            color: cssColor(COLORS[c]),
            fontStyle: "bold",
          }).setOrigin(0.5);
        }
        s.setPosition(x, y);
        scene.otherLabels[name]?.setPosition(x, y - 32);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      game.destroy(true);
    };
  }, [pin, username]);

  return <div ref={ref} className="w-full overflow-hidden rounded-xl border border-slate-800" />;
}