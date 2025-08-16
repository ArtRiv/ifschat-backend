import { socket, connectWithToken } from '../socket'

export function ConnectionManager() {
  function connect() {
    const token = localStorage.getItem('access_token') || ''
    connectWithToken(token)
  }

  function disconnect() {
    socket.disconnect()
  }

  return (
    <>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </>
  )
}