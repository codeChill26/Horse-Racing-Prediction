# Leg Removal & Public Races Endpoint

## Changes made (18 Jun 2026)

### 1. Removed Leg model entirely
- **`prisma/schema.prisma`**: Deleted model `Leg`, field `legId` on `Race`, relation `leg`, index `@@index([legId])`, field `legs` on `Tournament`
- **Deleted files**: `src/dto/leg.dto.js`, `src/services/adminLegs.js`, `src/controllers/adminLegs.controller.js`, `src/routes/admin/legs.js`
- **`src/dto/race.dto.js`**: Removed `legId` from `validateCreateRace()` and `validateUpdateRace()`
- **`src/services/adminRaces.js`**: Removed `legId`/`leg` from `adminRaceSelect()`; removed `listRacesByLeg()` method; removed `legId` params from `createRace()`/`updateRace()`
- **`src/controllers/adminRaces.controller.js`**: Removed `listRacesByLeg()` function and export
- **`src/routes/admin/races.js`**: Removed `GET /by-leg/:legId` route
- **`src/services/owner.js`**: Removed `leg` from `openRaceSelect()` and `myEntrySelect()`
- **`app.js`**: Removed `adminLegsRouter` import and two `app.use` mount lines

### 2. Added public endpoint `GET /api/tournaments/:id/races`
- **`src/services/tournaments.js`**: Added `listTournamentRaces(tournamentId)` — returns races with `entryCount` (approved count)
- **`src/controllers/tournaments.controller.js`**: Added `listTournamentRaces` handler
- **`src/routes/tournaments.js`**: Added `router.get('/:id/races', ...)` before `/:id`

### 3. Database sync
- Ran `npx prisma db push --accept-data-loss` to drop `Leg` table + `legId` column on Supabase Cloud
- Ran `npx prisma generate` to update Prisma Client
