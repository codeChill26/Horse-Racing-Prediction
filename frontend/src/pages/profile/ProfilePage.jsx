/**
 * Profile Page - Cá nhân
 * Wrapper around existing SpectatorProfilePage for route compatibility
 */

import { Navigate } from 'react-router-dom'
import SpectatorProfilePage from '../spectator/SpectatorProfilePage'

export default function ProfilePage() {
  return <SpectatorProfilePage />
}
