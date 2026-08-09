"use client";
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createBrowserClient } from "@supabase/ssr";

const COLORS = [0x6366f1, 0xef4444, 0x22c55e, 0xeab308, 0xec4899, 0x06b6d4, 0xf97316, 0xa855f7, 0x14b8a6, 0xf43f5e];

function colorIndexFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % COLORS.length;
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
      others: Record<string, Phaser.Physics.Arcade.Sprite> = {};
      obstacles!: Phaser.Physics.Arcade.Group;

      constructor() {
        super("LobbyScene");
      }

      preload() {
        const g = this.add.graphics();
        COLORS.forEach((c, i) => {
          g.fillStyle(c, 1).fillRect(0, 0, 40, 40).generateTexture(`player-${i}`, 40, 40);
        });
        g.fillStyle(0xef4444, 1).fillRect(0, 0, 30, 60).generateTexture("obstacle", 30, 60);
        g.destroy();
      }

      create() {
        this.player = this.physics.add.sprite(100, 250, `player-${myColor}`);
        this.player.setCollideWorldBounds(true);
        this.obstacles = this.physics.add.group();

        this.input.keyboard?.on("keydown-SPACE", () => this.jump());
        this.input.on("pointerdown", () => this.jump());

        this.time.addEvent({
          delay: 1500,
          loop: true,
          callback: () => {
            const o = this.obstacles.create(820, 250, "obstacle") as Phaser.Physics.Arcade.Sprite;
            o.setVelocityX(-220);
          },
        });

        this.physics.add.overlap(this.player, this.obstacles, () => {
          this.player.setPosition(100, 250);
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

      jump() {
        if (this.player.body?.touching.down) this.player.setVelocityY(-520);
      }
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current,
      width: 800,
      height: 300,
      backgroundColor: "#0f172a",
         physics: { default: "arcade", arcade: { gravity: { x: 0, y: 800 } } },
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
          scene.others[name] = s;
        }
        s.setPosition(x, y);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      game.destroy(true);
    };
  }, [pin, username]);

  return <div ref={ref} className="w-full overflow-hidden rounded-xl border border-slate-800" />;
}