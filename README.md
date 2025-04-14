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
