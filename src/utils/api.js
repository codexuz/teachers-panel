// API utility functions for handling HTTP requests

const API_BASE_URL = "https://backend.impulselc.uz/api";

// Get token from localStorage
const getAuthToken = () => {
  return localStorage.getItem("token");
};

// Get refresh token data from localStorage
const getRefreshTokenData = () => {
  const refreshToken = localStorage.getItem("refresh_token");
  const sessionId = localStorage.getItem("session_id");
  return refreshToken && sessionId ? { refreshToken, sessionId } : null;
};

// Group Homeworks API functions
export const groupHomeworksAPI = {
  // Get all homeworks for a group
  getByGroupId: (groupId) => apiRequest(`/group-homeworks/group/${groupId}`),

  // Get all homeworks by teacher ID
  getByTeacherId: (teacherId) =>
    apiRequest(`/group-homeworks/teacher/${teacherId}`),

  // Get a single homework by ID
  getById: (id) => apiRequest(`/group-homeworks/${id}`),

  // Create new homework assignment
  create: (homeworkData) =>
    apiRequest("/group-homeworks", {
      method: "POST",
      body: JSON.stringify(homeworkData),
    }),

  // Update homework assignment
  update: (id, homeworkData) =>
    apiRequest(`/group-homeworks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(homeworkData),
    }),

  // Delete homework assignment
  delete: (id) =>
    apiRequest(`/group-homeworks/${id}`, {
      method: "DELETE",
    }),
};

// Homework Submissions API functions
export const homeworkSubmissionsAPI = {
  // Get all submissions for a specific homework
  getByHomeworkId: (homeworkId) =>
    apiRequest(`/homework-submissions/homework/${homeworkId}`),

  // Get a single submission by ID
  getById: (id) => apiRequest(`/homework-submissions/${id}`),

  // Get submissions by student ID
  getByStudentId: (studentId) =>
    apiRequest(`/homework-submissions/student/${studentId}`),

  // Create new homework submission
  create: (submissionData) =>
    apiRequest("/homework-submissions", {
      method: "POST",
      body: JSON.stringify(submissionData),
    }),

  // Update homework submission
  update: (id, submissionData) =>
    apiRequest(`/homework-submissions/sections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(submissionData),
    }),

  // Grade homework submission
  grade: (id, gradeData) =>
    apiRequest(`/homework-submissions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(gradeData),
    }),

  // Delete homework submission
  delete: (id) =>
    apiRequest(`/homework-submissions/${id}`, {
      method: "DELETE",
    }),
};

// Group Assigned Units API functions
export const groupAssignedUnitsAPI = {
  // Get all assigned units for a group
  getByGroupId: (groupId) =>
    apiRequest(`/group-assigned-units/group/${groupId}`),

  // Create new unit assignment
  create: (assignmentData) =>
    apiRequest("/group-assigned-units", {
      method: "POST",
      body: JSON.stringify(assignmentData),
    }),

  // Update unit assignment
  update: (id, assignmentData) =>
    apiRequest(`/group-assigned-units/${id}`, {
      method: "PUT",
      body: JSON.stringify(assignmentData),
    }),

  // Delete unit assignment
  delete: (id) =>
    apiRequest(`/group-assigned-units/${id}`, {
      method: "DELETE",
    }),
};

// Group Assigned Lessons API functions
export const groupAssignedLessonsAPI = {
  // Get all assigned lessons for a group
  getByGroupId: (groupId) =>
    apiRequest(`/group-assigned-lessons/group/${groupId}`),

  // Create new lesson assignment
  create: (assignmentData) =>
    apiRequest("/group-assigned-lessons", {
      method: "POST",
      body: JSON.stringify(assignmentData),
    }),

  // Update lesson assignment
  update: (id, assignmentData) =>
    apiRequest(`/group-assigned-lessons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(assignmentData),
    }),

  // Delete lesson assignment
  delete: (id) =>
    apiRequest(`/group-assigned-lessons/${id}`, {
      method: "DELETE",
    }),
};

// Update tokens in localStorage
const updateTokens = (data) => {
  if (data.access_token) {
    localStorage.setItem("token", data.access_token);
  }
  if (data.refresh_token) {
    localStorage.setItem("refresh_token", data.refresh_token);
  }
  if (data.expiresAt) {
    localStorage.setItem("token_expires_at", data.expiresAt);
  }
  if (data.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
  }
};

// Generic API request function with automatic token refresh
async function apiRequest(endpoint, options = {}) {
  const makeRequest = async (token) => {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
        // Add authorization header if token exists
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const config = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    return response;
  };

  try {
    const token = getAuthToken();
    const response = await makeRequest(token);

    // If unauthorized and not already trying to refresh, attempt token refresh
    if (
      response.status === 401 &&
      !endpoint.includes("/auth/refresh") &&
      !endpoint.includes("/auth/login")
    ) {
      const refreshData = getRefreshTokenData();

      if (refreshData) {
        try {
          // Attempt to refresh token
          const refreshUrl = `${API_BASE_URL}/auth/refresh`;
          const refreshResponse = await fetch(refreshUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(refreshData),
          });

          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            updateTokens(refreshResult);

            // Retry original request with new token
            const retryResponse = await makeRequest(refreshResult.access_token);

            if (!retryResponse.ok) {
              throw new Error(`HTTP error! status: ${retryResponse.status}`);
            }

            const contentType = retryResponse.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              return await retryResponse.json();
            }
            return await retryResponse.text();
          }
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          // Clear auth data if refresh fails
          localStorage.removeItem("token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("session_id");
          localStorage.removeItem("token_expires_at");
          localStorage.removeItem("user");
        }
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage =
          errorJson.message || `HTTP error! status: ${response.status}`;
      } catch {
        errorMessage = errorText || `HTTP error! status: ${response.status}`;
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      error.response = {
        status: response.status,
        data: { message: errorMessage },
      };
      throw error;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

// Auth API functions
export const authAPI = {
  // Teacher login
  login: (credentials) =>
    apiRequest("/auth/teacher/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  // Logout
  logout: () =>
    apiRequest("/auth/logout", {
      method: "POST",
    }),

  // Get current user info
  me: () => apiRequest("/auth/profile"),

  // Refresh token
  refresh: (refreshData) =>
    apiRequest("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(refreshData),
    }),

  // Forgot password
  forgotPassword: (email) =>
    apiRequest("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  // Reset password
  resetPassword: (data) =>
    apiRequest("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Lessons API functions
export const lessonsAPI = {
  // Get all lessons
  getAll: () => apiRequest("/lessons"),

  // Get lessons by unit ID (module)
  getByUnit: (unitId) => apiRequest(`/lessons/unit/${unitId}`),

  // Get a single lesson by ID
  getById: (id) => apiRequest(`/lessons/${id}`),

  // Create a new lesson
  create: (lessonData) =>
    apiRequest("/lessons", {
      method: "POST",
      body: JSON.stringify(lessonData),
    }),

  // Update an existing lesson
  update: (id, lessonData) =>
    apiRequest(`/lessons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(lessonData),
    }),

  // Delete a lesson
  delete: (id) =>
    apiRequest(`/lessons/${id}`, {
      method: "DELETE",
    }),
};

// Course API functions
export const courseAPI = {
  // Get all courses
  getAll: () => apiRequest("/courses"),

  // Get a single course by ID
  getById: (id) => apiRequest(`/courses/${id}`),

  // Create a new course
  create: (courseData) =>
    apiRequest("/courses", {
      method: "POST",
      body: JSON.stringify(courseData),
    }),

  // Update an existing course
  update: (id, courseData) =>
    apiRequest(`/courses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(courseData),
    }),

  // Delete a course
  delete: (id) =>
    apiRequest(`/courses/${id}`, {
      method: "DELETE",
    }),
};

// Units API functions (formerly modules)
export const unitsAPI = {
  getAll: () => apiRequest(`/units`),
  // Get units by course ID
  getByCourseId: (courseId) => apiRequest(`/units/course/${courseId}`),

  // Get a single unit by ID
  getById: (id) => apiRequest(`/units/${id}`),

  // Create a new unit
  create: (unitData) =>
    apiRequest("/units", {
      method: "POST",
      body: JSON.stringify(unitData),
    }),

  // Update an existing unit
  update: (id, unitData) =>
    apiRequest(`/units/${id}`, {
      method: "PATCH",
      body: JSON.stringify(unitData),
    }),

  // Delete a unit
  delete: (id) =>
    apiRequest(`/units/${id}`, {
      method: "DELETE",
    }),
};

// Exercises API functions (formerly quiz questions)
export const exercisesAPI = {
  // Get all exercises
  getAll: () => apiRequest("/exercise"),

  // Get exercises by lesson ID
  getByLesson: (lessonId) => apiRequest(`/exercise/lesson/${lessonId}`),

  // Get a single exercise by ID
  getById: (id) => apiRequest(`/exercise/${id}`),

  // Create a new exercise
  create: (exerciseData) =>
    apiRequest("/exercise", {
      method: "POST",
      body: JSON.stringify(exerciseData),
    }),

  // Update an existing exercise
  update: (id, exerciseData) =>
    apiRequest(`/exercise/${id}`, {
      method: "PATCH",
      body: JSON.stringify(exerciseData),
    }),

  // Delete an exercise
  delete: (id) =>
    apiRequest(`/exercise/${id}`, {
      method: "DELETE",
    }),
};

// Speaking API functions
export const speakingAPI = {
  // Get all speaking exercises
  getAll: () => apiRequest("/speaking"),

  // Get speaking exercises by lesson ID
  getByLesson: (lessonId) => apiRequest(`/speaking/lesson/${lessonId}`),

  // Get a single speaking exercise by ID
  getById: (id) => apiRequest(`/speaking/${id}`),

  // Create a new speaking exercise
  create: (speakingData) =>
    apiRequest("/speaking", {
      method: "POST",
      body: JSON.stringify(speakingData),
    }),

  // Update an existing speaking exercise
  update: (id, speakingData) =>
    apiRequest(`/speaking/${id}`, {
      method: "PATCH",
      body: JSON.stringify(speakingData),
    }),

  // Delete a speaking exercise
  delete: (id) =>
    apiRequest(`/speaking/${id}`, {
      method: "DELETE",
    }),
};

// Pronunciation Exercise API functions
export const pronunciationAPI = {
  // Get all pronunciation exercises
  getAll: () => apiRequest("/pronunciation-exercise"),

  // Get pronunciation exercises by speaking ID
  getBySpeakingId: (speakingId) =>
    apiRequest(`/pronunciation-exercise/speaking/${speakingId}`),

  // Get a single pronunciation exercise by ID
  getById: (id) => apiRequest(`/pronunciation-exercise/${id}`),

  // Create a new pronunciation exercise
  create: (pronunciationData) =>
    apiRequest("/pronunciation-exercise", {
      method: "POST",
      body: JSON.stringify(pronunciationData),
    }),

  // Update an existing pronunciation exercise
  update: (id, pronunciationData) =>
    apiRequest(`/pronunciation-exercise/${id}`, {
      method: "PATCH",
      body: JSON.stringify(pronunciationData),
    }),

  // Delete a pronunciation exercise
  delete: (id) =>
    apiRequest(`/pronunciation-exercise/${id}`, {
      method: "DELETE",
    }),
};

// IELTS Part 1 Question API functions
export const ieltsPart1API = {
  // Get all IELTS Part 1 questions
  getAll: () => apiRequest("/ieltspart1-question"),

  // Get IELTS Part 1 questions by speaking ID
  getBySpeakingId: (speakingId) =>
    apiRequest(`/ieltspart1-question/speaking/${speakingId}`),

  // Get a single IELTS Part 1 question by ID
  getById: (id) => apiRequest(`/ieltspart1-question/${id}`),

  // Create a new IELTS Part 1 question
  create: (questionData) =>
    apiRequest("/ieltspart1-question", {
      method: "POST",
      body: JSON.stringify(questionData),
    }),

  // Update an existing IELTS Part 1 question
  update: (id, questionData) =>
    apiRequest(`/ieltspart1-question/${id}`, {
      method: "PATCH",
      body: JSON.stringify(questionData),
    }),

  // Delete an IELTS Part 1 question
  delete: (id) =>
    apiRequest(`/ieltspart1-question/${id}`, {
      method: "DELETE",
    }),
};

// IELTS Part 2 Question API functions
export const ieltsPart2API = {
  // Get all IELTS Part 2 questions
  getAll: () => apiRequest("/ieltspart2-question"),

  // Get IELTS Part 2 questions by speaking ID
  getBySpeakingId: (speakingId) =>
    apiRequest(`/ieltspart2-question/speaking/${speakingId}`),

  // Get a single IELTS Part 2 question by ID
  getById: (id) => apiRequest(`/ieltspart2-question/${id}`),

  // Create a new IELTS Part 2 question
  create: (questionData) =>
    apiRequest("/ieltspart2-question", {
      method: "POST",
      body: JSON.stringify(questionData),
    }),

  // Update an existing IELTS Part 2 question
  update: (id, questionData) =>
    apiRequest(`/ieltspart2-question/${id}`, {
      method: "PATCH",
      body: JSON.stringify(questionData),
    }),

  // Delete an IELTS Part 2 question
  delete: (id) =>
    apiRequest(`/ieltspart2-question/${id}`, {
      method: "DELETE",
    }),
};

// IELTS Part 3 Question API functions
export const ieltsPart3API = {
  // Get all IELTS Part 3 questions
  getAll: () => apiRequest("/ieltspart3-question"),

  // Get IELTS Part 3 questions by speaking ID
  getBySpeakingId: (speakingId) =>
    apiRequest(`/ieltspart3-question/speaking/${speakingId}`),

  // Get a single IELTS Part 3 question by ID
  getById: (id) => apiRequest(`/ieltspart3-question/${id}`),

  // Create a new IELTS Part 3 question
  create: (questionData) =>
    apiRequest("/ieltspart3-question", {
      method: "POST",
      body: JSON.stringify(questionData),
    }),

  // Update an existing IELTS Part 3 question
  update: (id, questionData) =>
    apiRequest(`/ieltspart3-question/${id}`, {
      method: "PATCH",
      body: JSON.stringify(questionData),
    }),

  // Delete an IELTS Part 3 question
  delete: (id) =>
    apiRequest(`/ieltspart3-question/${id}`, {
      method: "DELETE",
    }),
};

// Lesson Content API functions
export const lessonContentAPI = {
  // Get all lesson contents
  getAll: () => apiRequest("/lesson-content"),

  // Get lesson contents by lesson ID
  getByLesson: (lessonId) => apiRequest(`/lesson-content/lesson/${lessonId}`),

  // Get a single lesson content by ID
  getById: (id) => apiRequest(`/lesson-content/${id}`),

  // Create a new lesson content
  create: (contentData) =>
    apiRequest("/lesson-content", {
      method: "POST",
      body: JSON.stringify(contentData),
    }),

  // Update an existing lesson content
  update: (id, contentData) =>
    apiRequest(`/lesson-content/${id}`, {
      method: "PATCH",
      body: JSON.stringify(contentData),
    }),

  // Delete a lesson content
  delete: (id) =>
    apiRequest(`/lesson-content/${id}`, {
      method: "DELETE",
    }),
};

// Vocabulary API functions
export const vocabularyAPI = {
  // Get all vocabulary sets
  getAll: () => apiRequest("/vocabulary-sets"),

  // Get a single vocabulary set by ID
  getById: (id) => apiRequest(`/vocabulary-sets/${id}`),

  // Create a new vocabulary set
  create: (setData) =>
    apiRequest("/vocabulary-sets", {
      method: "POST",
      body: JSON.stringify(setData),
    }),

  // Update an existing vocabulary set
  update: (id, setData) =>
    apiRequest(`/vocabulary-sets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(setData),
    }),

  // Delete a vocabulary set
  delete: (id) =>
    apiRequest(`/vocabulary-sets/${id}`, {
      method: "DELETE",
    }),
};

// Vocabulary Items API functions
export const vocabularyItemsAPI = {
  // Get all vocabulary items
  getAll: () => apiRequest("/vocabulary-items"),

  // Get vocabulary items by set ID
  getBySetId: (setId) => apiRequest(`/vocabulary-items/set/${setId}`),

  // Get a single vocabulary item by ID
  getById: (id) => apiRequest(`/vocabulary-items/${id}`),

  // Create a new vocabulary item
  create: (itemData) =>
    apiRequest("/vocabulary-items", {
      method: "POST",
      body: JSON.stringify(itemData),
    }),

  // Update an existing vocabulary item
  update: (id, itemData) =>
    apiRequest(`/vocabulary-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(itemData),
    }),

  // Delete a vocabulary item
  delete: (id) =>
    apiRequest(`/vocabulary-items/${id}`, {
      method: "DELETE",
    }),

  // Bulk import vocabulary items
  bulkImport: (setId, items) =>
    apiRequest("/vocabulary-items/bulk", {
      method: "POST",
      body: JSON.stringify({ setId, items }),
    }),
};

// Lesson Vocabulary Sets API functions
export const lessonVocabularyAPI = {
  // Get all lesson vocabulary assignments
  getAll: () => apiRequest("/lesson-vocabulary-sets"),

  // Get vocabulary assignments by lesson ID
  getByLessonId: (lessonId) =>
    apiRequest(`/lesson-vocabulary-sets/lesson/${lessonId}`),

  // Get vocabulary assignments by vocabulary item ID
  getByVocabularyItemId: (itemId) =>
    apiRequest(`/lesson-vocabulary-sets/vocabulary/${itemId}`),

  // Create a new vocabulary assignment
  create: (assignmentData) =>
    apiRequest("/lesson-vocabulary-sets", {
      method: "POST",
      body: JSON.stringify(assignmentData),
    }),

  // Create multiple vocabulary assignments at once
  bulkCreate: (assignments) =>
    apiRequest("/lesson-vocabulary-sets/bulk", {
      method: "POST",
      body: JSON.stringify({ assignments }),
    }),

  // Delete a vocabulary assignment
  delete: (id) =>
    apiRequest(`/lesson-vocabulary-sets/${id}`, {
      method: "DELETE",
    }),

  // Delete assignment by lesson and vocabulary item
  deleteByLessonAndItem: (lessonId, vocabularyItemId) =>
    apiRequest(
      `/lesson-vocabulary-sets/lesson/${lessonId}/vocabulary-item/${vocabularyItemId}`,
      { method: "DELETE" }
    ),
};

// Groups API functions
export const groupsAPI = {
  // Get all groups
  getAll: () => apiRequest("/groups"),

  // Get groups by teacher ID
  getByTeacherId: (teacherId) => apiRequest(`/groups/teacher/${teacherId}`),

  // Get a single group by ID
  getById: (id) => apiRequest(`/groups/${id}`),

  // Create a new group
  create: (groupData) =>
    apiRequest("/groups", {
      method: "POST",
      body: JSON.stringify(groupData),
    }),

  // Update an existing group
  update: (id, groupData) =>
    apiRequest(`/groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(groupData),
    }),

  // Delete a group
  delete: (id) =>
    apiRequest(`/groups/${id}`, {
      method: "DELETE",
    }),

  // Get group students
  getStudents: (groupId) => apiRequest(`/groups/${groupId}/students`),

  // Add student to group
  addStudent: (groupId, studentData) =>
    apiRequest(`/groups/${groupId}/students`, {
      method: "POST",
      body: JSON.stringify(studentData),
    }),

  // Remove student from group
  removeStudent: (groupId, studentId) =>
    apiRequest(`/groups/${groupId}/students/${studentId}`, {
      method: "DELETE",
    }),

  // Assign content (units and lessons) to group
  assignUnits: (assignmentData) =>
    apiRequest(`/group-assigned-units`, {
      method: "POST",
      body: JSON.stringify(assignmentData),
    }),

  // Get assigned content for group
  getAssignedUnits: (groupId) =>
    apiRequest(`/group-assigned-units/group/${groupId}`),

  // Remove content assignment from group
  removeContentAssignment: (groupId, assignmentId) =>
    apiRequest(`/groups/${groupId}/assignments/${assignmentId}`, {
      method: "DELETE",
    }),

  // Get group statistics
  getStats: (groupId) => apiRequest(`/groups/${groupId}/stats`),
};

// Trial Lessons API functions
export const trialLessonsAPI = {
  // Get trial lessons by teacher ID
  getByTeacherId: (teacherId) =>
    apiRequest(`/lead-trial-lessons/by-teacher/${teacherId}`),

  // Get all trial lessons
  getAll: () => apiRequest("/lead-trial-lessons"),

  // Get a single trial lesson by ID
  getById: (id) => apiRequest(`/lead-trial-lessons/${id}`),

  // Create a new trial lesson
  create: (lessonData) =>
    apiRequest("/lead-trial-lessons", {
      method: "POST",
      body: JSON.stringify(lessonData),
    }),

  // Update an existing trial lesson
  update: (id, lessonData) =>
    apiRequest(`/lead-trial-lessons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(lessonData),
    }),

  // Delete a trial lesson
  delete: (id) =>
    apiRequest(`/lead-trial-lessons/${id}`, {
      method: "DELETE",
    }),
};

// File Upload API functions
export const uploadAPI = {
  // Upload a single file with progress tracking
  uploadFile: async (file, options = {}) => {
    const url = `${API_BASE_URL}/upload`;
    const token = getAuthToken();

    // Create FormData
    const formData = new FormData();
    formData.append("file", file);

    // Use XMLHttpRequest for upload progress support
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Setup progress tracking
      if (options && options.onUploadProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            options.onUploadProgress(event);
          }
        });
      }

      // Setup response handlers
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          let errorMessage;
          try {
            const errorJson = JSON.parse(xhr.responseText);
            errorMessage =
              errorJson.message || `Upload failed with status: ${xhr.status}`;
          } catch {
            errorMessage =
              xhr.responseText || `Upload failed with status: ${xhr.status}`;
          }

          const error = new Error(errorMessage);
          error.status = xhr.status;
          reject(error);
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"));
      });

      // Setup request
      xhr.open("POST", url);

      // Set authorization header
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      // Send request
      xhr.send(formData);
    });
  },

  // Upload multiple files
  uploadMultiple: async (files, type = "general", options = {}) => {
    const url = `${API_BASE_URL}/upload/multiple`;
    const token = getAuthToken();

    const formData = new FormData();

    // Append multiple files
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });

    formData.append("type", type);

    // Add additional fields if provided
    if (options.metadata) {
      Object.keys(options.metadata).forEach((key) => {
        formData.append(key, options.metadata[key]);
      });
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage =
            errorJson.message ||
            `Multiple upload failed with status: ${response.status}`;
        } catch {
          errorMessage =
            errorText ||
            `Multiple upload failed with status: ${response.status}`;
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error("Multiple file upload failed:", error);
      throw error;
    }
  },

  // Delete uploaded file
  deleteFile: (fileId) =>
    apiRequest(`/upload/${fileId}`, {
      method: "DELETE",
    }),

  // Get file info
  getFileInfo: (fileId) => apiRequest(`/upload/${fileId}`),

  // Get files by type
  getFilesByType: (type) => apiRequest(`/upload?type=${type}`),
};

// Students API functions
export const studentsAPI = {
  // Get all students
  getAll: () => apiRequest("/users/students"),

  // Get student by ID
  getById: (id) => apiRequest(`/users/${id}`),

  // Create new student
  create: (studentData) =>
    apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(studentData),
    }),

  // Update student
  update: (id, studentData) =>
    apiRequest(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(studentData),
    }),

  // Delete student
  delete: (id) =>
    apiRequest(`/users/${id}`, {
      method: "DELETE",
    }),
};

// Group Students API functions
export const groupStudentsAPI = {
  // Get students by group ID
  getByGroupId: (groupId) => apiRequest(`/group-students/group/${groupId}`),

  // Add student to group
  addToGroup: (groupStudentData) =>
    apiRequest("/group-students", {
      method: "POST",
      body: JSON.stringify(groupStudentData),
    }),

  // Remove student from group
  removeFromGroup: (groupStudentId) =>
    apiRequest(`/group-students/${groupStudentId}`, {
      method: "DELETE",
    }),
};

// Attendance API functions
export const attendanceAPI = {
  // Get attendance by group ID and date range
  getByGroupIdAndDateRange: (groupId, startDate, endDate) =>
    apiRequest(
      `/attendance/group/${groupId}/daterange?startDate=${startDate}&endDate=${endDate}`
    ),

  // Create attendance record
  create: (attendanceData) =>
    apiRequest("/attendance", {
      method: "POST",
      body: JSON.stringify(attendanceData),
    }),

  // Update attendance
  update: (id, attendanceData) =>
    apiRequest(`/attendance/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: attendanceData }),
    }),
};

// Speaking Responses API functions
export const speakingResponsesAPI = {
  // Get speaking responses by speaking ID
  getBySpeakingId: (speakingId) =>
    apiRequest(`/speaking-responses/speaking/${speakingId}`),

  // Get speaking response by ID
  getById: (id) => apiRequest(`/speaking-responses/${id}`),

  // Update speaking response (for grading)
  update: (id, responseData) =>
    apiRequest(`/speaking-responses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(responseData),
    }),

  // Delete speaking response
  delete: (id) =>
    apiRequest(`/speaking-responses/${id}`, {
      method: "DELETE",
    }),
};
