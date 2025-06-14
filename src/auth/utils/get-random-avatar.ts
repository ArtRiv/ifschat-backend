export function getRandomAvatar (userId: number | undefined): string {
  const avatars: string[] = [
    '/avatars/bear.png',
    '/avatars/cat.png',
    '/avatars/dog.png',
    '/avatars/duck.png',
    '/avatars/gorilla.png',
    '/avatars/meerkat.png',
    '/avatars/owl.png',
    '/avatars/panda.png',
    '/avatars/sea-lion.png',
  ]
  const defaultAvatar: string = '/avatars/default.png'

  if (userId === undefined || userId === null || avatars.length === 0) {
    console.warn('No user ID provided or no avatars available, returning default avatar.')
    return defaultAvatar;
  }

  const avatarIndex = userId % avatars.length;
  return avatars[avatarIndex] || defaultAvatar;
}
