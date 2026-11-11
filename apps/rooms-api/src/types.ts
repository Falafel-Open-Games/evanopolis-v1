export type EntryFeeTier = "cheap" | "average" | "deluxe" | "custom";
export type PlayerCount = 2 | 3 | 4 | 5 | 6;

export interface ExperimentalRoomOptions {
  readonly turn_duration_seconds?: number;
}

export interface CreateRoomRequest {
  readonly creator_display_name: string;
  readonly entry_fee_tier: EntryFeeTier;
  readonly entry_fee_amount: string;
  readonly player_count: PlayerCount;
  readonly experimental?: ExperimentalRoomOptions;
}

export interface RoomRecord extends CreateRoomRequest {
  readonly game_id: string;
  readonly created_by: string;
  readonly created_at: string;
}

export type PublicRoomRecord = Omit<RoomRecord, "created_by">;

export interface AuthWhoamiResponse {
  readonly sub?: unknown;
}

export interface ValidationDetail {
  readonly field: string;
  readonly message: string;
}
