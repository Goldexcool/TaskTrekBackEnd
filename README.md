<<<<<<< HEAD
# TaskTrek API

This project is a TaskTrek application that allows users to manage tasks within teams using a Kanban-style interface. It includes features for user authentication, team management, boards, columns, and tasks.

## Core Features

1. **User Authentication**
   - Signup, login, and logout functionality.
   - JWT-based authentication with password hashing using bcrypt.

2. **Team Management**
   - Users can create teams and invite members.
   - Each team can have multiple boards.

3. **Boards**
   - Teams can create multiple boards (e.g., "Marketing Sprint").
   - Boards contain columns and tasks, accessible only to team members.

4. **Columns (Kanban-style)**
   - Default columns: To Do, In Progress, Done.
   - Option to create custom columns.

5. **Tasks**
   - Tasks belong to a column within a board.
   - Each task has a title, description, due date, status, and assigned user.
   - Tasks can be moved between columns and can be edited or deleted.

6. **User Roles (Optional for MVP)**
   - Admin: Create/edit/delete teams, boards, and invite users.
   - Member: Create/edit tasks and move tasks.

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT for auth, bcrypt for password hashing
- **Environment Variables**: dotenv
- **CORS**: Enabled for cross-origin requests

## API Endpoints

### Auth Routes
- `POST /api/auth/signup`: User signup
- `POST /api/auth/login`: User login
- `GET /api/auth/me`: Get current user information

### Main API Routes

#### Teams
- `POST /api/teams`: Create a team
- `GET /api/teams`: Get teams for the logged-in user
- `POST /api/teams/:teamId/invite`: Invite a member to a team

#### Boards
- `POST /api/boards`: Create a board under a team
- `GET /api/boards/:teamId`: Get boards under a team
- `GET /api/boards/:boardId`: Get a single board with columns and tasks

#### Columns
- `POST /api/columns`: Create a column
- `GET /api/columns/:boardId`: Get columns for a board

#### Tasks
- `POST /api/tasks`: Create a task
- `PUT /api/tasks/:taskId`: Update a task (move to another column, change assignee, etc.)
- `DELETE /api/tasks/:taskId`: Delete a task

## Getting Started

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd kanban-board-api
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Set up environment variables in a `.env` file:
   ```
   DATABASE_URL=<your_mongodb_connection_string>
   JWT_SECRET=<your_jwt_secret>
   ```

5. Start the server:
   ```
   npm start
   ```

## License

This project is licensed under the MIT License.# TaskTrek
=======
This is a Next.js project bootstrapped with create-next-app.

Getting Started
First, run the development server:

npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
TaskTrek - Modern Task Management Platform
TaskTrek is a comprehensive task management application built with Next.js that helps teams and individuals organize, track, and complete their tasks efficiently. With an intuitive interface and powerful features, TaskTrek streamlines your workflow and boosts productivity.

TaskTrek Dashboard

🌟 Features
Core Functionality
Task Management: Create, edit, and track tasks with customizable fields
Board View: Kanban-style boards for visual task organization
List View: Traditional list view for detailed task information
Calendar View: See your tasks in a calendar format for better time management
Advanced Features
Priority Levels: Mark tasks with different priority levels (low, medium, high, critical)
Due Dates: Set and track deadlines for your tasks
Labels & Tags: Categorize tasks with custom labels
Task Assignment: Assign tasks to team members
Task Statistics: Get insights on your tasks and productivity
Search & Filter: Quickly find the tasks you need
User Experience
Responsive Design: Works seamlessly on desktop, tablet, and mobile devices
Dark/Light Mode: Choose your preferred visual theme
Glassmorphism UI: Modern, visually appealing interface with optional blur effects
Keyboard Shortcuts: Power-user shortcuts for faster navigation
Animations: Smooth transitions and animations for a polished experience
🚀 Getting Started
Prerequisites
Node.js 16.x or later
npm or yarn package manager
MongoDB database (for storing task data)
Installation
Clone the repository:
git clone https://github.com/Goldexcool/tasktrek.git
cd tasktrek
npm install
# or
yarn install
Set up environment variables: Create a .env.local file in the root directory with the following variables:
NEXT_PUBLIC_API_URL=your_api_url
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
npm run dev
# or
yarn dev
Open http://localhost:3000 with your browser to see TaskTrek in action.
🔧 Project Structure
tasktrek/
├── app/                  # Next.js App Router pages and layouts
│   ├── boards/           # Board view related pages
│   ├── calendar/         # Calendar view related pages
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utility functions and helpers
│   ├── store/            # State management with Zustand
│   ├── tasks/            # Task management related pages
│   └── layout.tsx        # Root layout component
├── public/               # Static assets
├── styles/               # Global styles
└── README.md             # Project documentation
💻 Technologies Used
Frontend:

Next.js 14: React framework with App Router
React: JavaScript UI library
TypeScript: Type-safe JavaScript
Tailwind CSS: Utility-first CSS framework
Framer Motion: Animation library
Lucide Icons: Beautiful SVG icons
State Management:

Zustand: Lightweight state management
Components & UI:

Shadcn UI: Reusable component system
Radix UI: Headless UI primitives
📱 Key User Flows
Task Management
Creating a Task:

Navigate to the Tasks page
Click "New Task" button
Fill in task details (title, description, due date, priority)
Assign to team members if needed
Add labels for categorization
Click "Create Task"
Board Management:

Navigate to Boards page
Create a new board or select existing one
Add columns to represent workflow stages
Drag and drop tasks between columns
Visualize task progress across the workflow
Calendar Integration:

View tasks in calendar view
Tasks are displayed based on due dates
Click on dates to see tasks due that day
Easily identify overdue tasks
🔒 Authentication & Authorization
TaskTrek includes a complete authentication system:

User registration and login
JWT-based authentication
Role-based access control
Secure API routes
🧩 API Integration
TaskTrek's frontend communicates with aRESTful API for data persistence:

Task CRUD operations
Board management
User authentication
Team collaboration
npm test
# or
yarn test
 Deployment
TaskTrek can be deployed to various platforms:

Vercel (recommended for Next.js apps):

Connect your GitHub repository
Vercel will automatically deploy your app
Set up environment variables in the Vercel dashboard
Other platforms:

Build the application: npm run build
Start the production server: npm start
🔧 Troubleshooting
Common issues and solutions:

Build errors related to client components:

Ensure all client components are properly wrapped with 'use client' directive
Check for missing imports or incorrectly referenced components
API connection issues:

Verify your environment variables are set correctly
Check network requests in browser developer tools
🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

Fork the repository
Create your feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add some amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

📬 Contact
For questions or support, please open an issue in the repository or contact the maintainers directly.

TaskTrek - Organize your work, streamline your life.
>>>>>>> a4deb45e6a363ecc31ff10d93176c9af19148629
# TaskTrekBackend
# TaskTrekBackend
