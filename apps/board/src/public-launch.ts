// A Production deployment is not itself permission to expose the board.
export function publicBoardEnabled(){
  return process.env.VERCEL_ENV!=='production'||process.env.BOARD_PUBLIC_LAUNCH_ENABLED==='true';
}
