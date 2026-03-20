export interface StartConnectionAuthUrlDto {
  type: 'auth_url';
  url: string;
}

export interface StartConnectionInstructionsDto {
  type: 'instructions';
  title: string;
  steps: string[];
  message?: string;
}

export type StartConnectionResponseDto =
  | StartConnectionAuthUrlDto
  | StartConnectionInstructionsDto;
