export class CreateChatDto {
  name?: string;
  participantIds: string[];
  isGroupChat: boolean;
  description?: string;
}
