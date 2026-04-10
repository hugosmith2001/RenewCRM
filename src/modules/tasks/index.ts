/**
 * Tasks module – Phase 7.
 * Task CRUD with due date, priority, status, and assignment; scoped by customer and tenant.
 */
export {
  listTasksForTenant,
  listTasksByCustomerId,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  type TaskForWorkQueue,
} from "./service";
