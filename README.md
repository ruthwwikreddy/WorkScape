# WorkScape: Spatial Virtual Office

WorkScape is a high-performance, spatial virtual office platform designed for modern remote teams. It prioritizes digital sovereignty and local-first performance by utilizing a distributed architecture. This project enables teams to collaborate in a shared 2D environment with proximity-based voice chat, persistent shared state, and real-time interactions without the overhead or privacy concerns of centralized platforms.

## Core Philosophy

The primary vision of WorkScape is to bring the spontaneity and natural connection of physical offices into the digital realm. By focusing on a local-first experience, the application ensures that critical communication data, such as real-time audio and private signaling, remains within the user's control.

## Technical Architecture

WorkScape is built using a modern technology stack designed for low latency and high scalability:

- Frontend: React with TypeScript and Vite for a responsive, type-safe development experience.
- Styling: Vanilla CSS and Tailwind CSS for high-fidelity glassmorphic UI components.
- Animations: Motion (formerly Framer Motion) for smooth spatial transitions and interactive feedback.
- Backend/Real-time: Firebase Suite including:
    - Firestore: Used for persistent data such as user profiles, tasks, and room configurations.
    - Real-time Database (RTDB): Utilized for high-frequency synchronization of avatar positions and signaling.
    - Cloud Storage: Enables secure peer-to-peer file sharing within workspace rooms.
    - Authentication: Google Auth for secure identity management.
- Communication: Simple-Peer for WebRTC implementations, providing direct peer-to-peer spatial audio.

## Key Features

### Spatial Proximity Voice
Users communicate through real-time audio that scales in volume based on their digital proximity. This enables natural "walk-up" conversations and reduces the friction associated with scheduled video calls.

### Persistent Shared Workspaces
The office environment is persistent. Sticky notes, task lists, and office configurations remain exactly where they were left, allowing for asynchronous collaboration and a consistent sense of place.

### Privacy and Isolation
- Private Bubbles: Users can step into isolated areas for 1-on-1 or small group conversations that are digitally shielded from the rest of the office.
- Status Management: Integrated status modes (Available, Busy, Focus) provide clear signals to the team about individual availability.

### Distributed File Sharing
Collaborators can upload and share files directly within the workspace. These assets are scoped to the specific room and managed with granular permissions.

## Local Setup and Deployment

WorkScape is designed to be self-hosted, giving you complete ownership over your data and infrastructure.

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Firebase Project (Google account required)

### Installation Steps

1. Clone the repository:
   git clone https://github.com/ruthwikreddy/WorkScape
   cd WorkScape

2. Install dependencies:
   npm install

3. Environment Configuration:
   Copy the example environment file and populate it with your Firebase configuration keys:
   cp .env.example .env

   Required keys:
   - VITE_FIREBASE_API_KEY
   - VITE_FIREBASE_AUTH_DOMAIN
   - VITE_FIREBASE_PROJECT_ID
   - VITE_FIREBASE_STORAGE_BUCKET
   - VITE_FIREBASE_MESSAGING_SENDER_ID
   - VITE_FIREBASE_APP_ID
   - VITE_FIREBASE_DATABASE_URL

4. Running the Development Server:
   npm run dev

The application will be available at http://localhost:5173. Accessing the application locally will unlock the full workspace functionality.

## Security and Compliance

WorkScape utilizes industry-standard encryption for signaling and peer-to-peer communication. Since the application is self-hosted, your data remains within your specific Firebase project and is governed by your own security rules.

## Contribution Guidelines

Contributions are welcome. Please ensure that all pull requests follow the established coding standards and include necessary tests. Maintain the architectural integrity by favoring composition over complex inheritance patterns.

## License

This project is licensed under the Apache-2.0 License.
