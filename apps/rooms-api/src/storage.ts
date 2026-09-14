import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RoomRecord } from "./types.js";
import { isRoomRecord } from "./validation.js";

export class RoomsStore {
  readonly #rooms = new Map<string, RoomRecord>();
  readonly #rooms_data_file: string;

  constructor(rooms_data_file = "") {
    this.#rooms_data_file = rooms_data_file;
  }

  async initialize(): Promise<void> {
    if (this.#rooms_data_file === "") {
      return;
    }

    let raw: string;
    try {
      raw = await readFile(this.#rooms_data_file, "utf8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return;
      }
      throw error;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("rooms_data_file_must_contain_an_array");
    }

    for (const [index, room] of parsed.entries()) {
      if (!isRoomRecord(room)) {
        console.warn(`Skipping incompatible room record at index ${index} in ${this.#rooms_data_file}`);
        continue;
      }
      this.#rooms.set(room.game_id, room);
    }
  }

  async createRoom(room: RoomRecord): Promise<RoomRecord> {
    this.#rooms.set(room.game_id, room);
    await this.#persist();
    return room;
  }

  getRoom(game_id: string): RoomRecord | null {
    return this.#rooms.get(game_id) ?? null;
  }

  async #persist(): Promise<void> {
    if (this.#rooms_data_file === "") {
      return;
    }

    const directory = dirname(this.#rooms_data_file);
    const temp_path = `${this.#rooms_data_file}.tmp`;
    const payload = JSON.stringify(Array.from(this.#rooms.values()), null, 2);

    await mkdir(directory, { recursive: true });
    await writeFile(temp_path, payload);
    await rename(temp_path, this.#rooms_data_file);
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}
