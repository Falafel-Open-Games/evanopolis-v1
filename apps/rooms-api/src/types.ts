export type EntryFeeTier = "cheap" | "average" | "deluxe";

export interface ExperimentalRoomOptions {
  readonly turn_duration_seconds?: number;
}

export interface CreateRoomRequest {
  readonly creator_display_name: string;
  readonly entry_fee_tier: EntryFeeTier;
  readonly player_count: 2 | 3 | 4;
  readonly experimental?: ExperimentalRoomOptions;
}

export interface RoomRecord extends CreateRoomRequest {
  readonly game_id: string;
  readonly created_by: string;
  readonly entry_fee_amount: string;
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
