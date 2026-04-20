import { isElectron } from './environment'

const PROD_API    = 'https://vertex.sergidalmau.dev/api/v1'
const PROD_SOCKET = 'https://vertex.sergidalmau.dev'

export const ENV = {
  // In Electron there is no CORS — always use full URL.
  // In browser dev (dev:web) VITE_ vars point to proxy paths.
  API_URL:    isElectron() ? PROD_API    : (import.meta.env.VITE_API_URL    || PROD_API),
  SOCKET_URL: isElectron() ? PROD_SOCKET : (import.meta.env.VITE_SOCKET_URL || PROD_SOCKET),
}
