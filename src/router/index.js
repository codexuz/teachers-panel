import { createRouter, createWebHashHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth.js";
import LoginView from "../views/LoginView.vue";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { requiresGuest: true },
    },
    {
      path: "/",
      redirect: "/dashboard",
    },
    {
      path: "/dashboard",
      component: () => import("../views/DashboardView.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          name: "dashboard",
          component: () => import("../views/HomeView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/courses",
          name: "courses",
          component: () => import("../views/CoursesView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/javlon/courses",
          name: "javlon-courses",
          component: () => import("../views/javlon/CoursesView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/units",
          name: "units",
          component: () => import("../views/UnitsView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/javlon/units",
          name: "javlon-units",
          component: () => import("../views/javlon/UnitsView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/lessons",
          name: "lessons",
          component: () => import("../views/LessonsView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/javlon/lessons",
          name: "javlon-lessons",
          component: () => import("../views/javlon/LessonsView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/lesson-contents",
          name: "lesson-contents",
          component: () => import("../views/LessonContentsView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/exercises",
          name: "exercises",
          component: () => import("../views/ExercisesView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/exercises/:id",
          name: "exercise-detail",
          component: () => import("../views/ExerciseDetail.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/speaking",
          name: "speaking",
          component: () => import("../views/SpeakingView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/speaking/:id",
          name: "speaking-detail",
          component: () => import("../views/SpeakingDetail.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/pronunciation/:speakingId",
          name: "pronunciation-detail",
          component: () => import("../views/PronunciationDetail.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/homework",
          name: "homework",
          component: () => import("../views/HomeWork.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/vocabulary",
          name: "vocabulary",
          component: () => import("../views/VocabularyView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/vocabulary-items/:id",
          name: "vocabulary-items",
          component: () => import("../views/VocabularyItem.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/groups",
          name: "groups",
          component: () => import("../views/GroupsView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/groups/:id/manage",
          name: "group-management",
          component: () => import("../views/GroupManagementView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/group-assignment",
          name: "GroupAssignment",
          component: () => import("../views/GroupAssignmentView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/group-assignment/:groupId/units-lessons",
          name: "UnitsLessonsAssignment",
          component: () => import("../views/UnitsLessonsAssignmentView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/group-homework",
          name: "GroupHomework",
          component: () => import("../views/GroupHomeworkView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/homework-check",
          name: "HomeworkCheck",
          component: () => import("../views/HomeworkCheckView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/homework-check/:homeworkId",
          name: "HomeworkCheckDetails",
          component: () => import("../views/HomeworkCheckDetails.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/messages",
          name: "messages",
          component: () => import("../views/MessagesView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/exams",
          name: "exams",
          component: () => import("../views/ExamsView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/exam-results",
          name: "exam-results",
          component: () => import("../views/ExamResultsView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/library",
          name: "library",
          component: () => import("../views/LibraryView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/articles",
          name: "articles",
          component: () => import("../views/Articles.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/lesson-vocabulary",
          name: "lesson-vocabulary",
          component: () => import("../views/LessonVocabularyView.vue"),
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      redirect: "/login",
    },
  ],
});

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Check if route requires authentication
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!authStore.isAuthenticated) {
      // Redirect to login with return url
      next({
        name: "login",
        query: { redirect: to.fullPath },
      });
      return;
    }

    // Verify token is still valid for protected routes
    const isValid = await authStore.checkAuth();
    if (!isValid) {
      next({
        name: "login",
        query: { redirect: to.fullPath },
      });
      return;
    }
  }

  // Check if route requires guest (already logged in users shouldn't access)
  if (to.matched.some((record) => record.meta.requiresGuest)) {
    if (authStore.isAuthenticated) {
      next({ name: "dashboard" });
      return;
    }
  }

  next();
});

export default router;
