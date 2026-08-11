"use client";
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createBrowserClient } from "@supabase/ssr";

const COLORS = [0x6366f1, 0xef4444, 0x22c55e, 0xeab308, 0xec4899, 0x06b6d4, 0xf97316, 0xa855f7, 0x14b8a6, 0xf43f5e];
const BG_COLORS = ["#0f172a", "#1a2e05", "#2e1065", "#450a0a", "#082f49", "#3f2d04"];

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
      myLabel!: Phaser.GameObjects.Text;

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
        g.fillStyle(0x334155, 1).fillRect(0, 0, 800, 24).generateTexture("ground", 800, 24);
        g.destroy();
      }

      create() {
        this.cameras.main.setBackgroundColor("#0f172a");

        const ground = this.physics.add.staticGroup();
        ground.create(400, 288, "ground");

        this.player = this.physics.add.sprite(120, 200, `player-${myColor}`);
        this.player.setCollideWorldBounds(true);

        this.myLabel = this.add.text(120, 160, username, {
          fontSize: "13px",
          color: cssColor(COLORS[myColor]),
          fontStyle: "bold",
        }).setOrigin(0.5);

        this.obstacles = this.physics.add.group();

        this.physics.add.collider(this.player, ground);

        this.physics.add.overlap(this.player, this.obstacles, (_p, o) => {
          (o as Phaser.Physics.Arcade.Sprite).destroy();
          this.player.setTint(0xffffff);
          this.time.delayedCall(150, () => this.player.clearTint());
        });

        const jump = () => {
          if (this.player.body && this.player.body.touching.down) {
            this.player.setVelocityY(-430);
          }
        };
        this.input.on("pointerdown", jump);
        if (this.input.keyboard) {
          this.input.keyboard.addCapture(["SPACE", "UP"]);
          this.input.keyboard.on("keydown-SPACE", jump);
          this.input.keyboard.on("keydown-UP", jump);
        }

        this.time.addEvent({
          delay: 1400,
          loop: true,
          callback: () => {
            const ob = this.obstacles.create(840, 252, "obstacle") as Phaser.Physics.Arcade.Sprite;
            const b = ob.body as Phaser.Physics.Arcade.Body;
            if (b) {
              b.setAllowGravity(false);
              b.setVelocityX(-260);
            }
          },
        });

        this.time.addEvent({
          delay: 100,
          loop: true,
          callback: () => {
            channel.send({
              type: "broadcast",
              event: "pos",
              payload: { name: username, x: this.player.x, y: this.player.y, c: myColor },
            });
          },
        });
      }

      update() {
        this.obstacles.getChildren().forEach((child) => {
          const ob = child as Phaser.Physics.Arcade.Sprite;
          if (ob.x < -60) ob.destroy();
        });
        this.myLabel.setPosition(this.player.x, this.player.y - 32);
        const idx = Math.floor(this.time.now / 10000) % BG_COLORS.length;
        this.cameras.main.setBackgroundColor(BG_COLORS[idx]);
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
        let s = scene.others[name];
        if (!s) {
          s = scene.physics.add.sprite(x, y, `player-${c}`);
          const sb = s.body as Phaser.Physics.Arcade.Body;
          if (sb) sb.setAllowGravity(false);
          scene.o