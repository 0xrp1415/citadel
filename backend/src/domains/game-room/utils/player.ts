export interface IPlayerRoomInstance {
  user_id: string;
  index: string;
}

export interface IPlayerJSON extends Omit<IPlayerRoomInstance, "user_id"> {
  isHost: boolean;
}
