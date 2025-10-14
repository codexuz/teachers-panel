<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import {
  lessonsAPI,
  vocabularyAPI,
  vocabularyItemsAPI,
  lessonVocabularyAPI,
  courseAPI,
  unitsAPI,
} from "@/utils/api.js";

// State
const isLoading = ref(false);
const error = ref("");
const searchQuery = ref("");
const selectedLesson = ref(null);
const selectedVocabularySet = ref(null);
const selectedCourse = ref("");
const selectedUnit = ref("");
const selectedLevel = ref("");
const showAssignModal = ref(false);
const searchingLessons = ref(false);
const searchingVocabItems = ref(false);
const selectedVocabularyItems = ref([]);
const assignmentsLoading = ref(false);
const assignedVocabularies = ref([]);

// Data
const lessons = ref([]);
const vocabularySets = ref([]);
const vocabularyItems = ref([]);
const courses = ref([]);
const units = ref([]);

// Language levels
const languageLevels = [
  { value: "A1", label: "A1 - Beginner" },
  { value: "A2", label: "A2 - Elementary" },
  { value: "B1", label: "B1 - Intermediate" },
  { value: "B2", label: "B2 - Upper Intermediate" },
  { value: "C1", label: "C1 - Advanced" },
  { value: "C2", label: "C2 - Proficiency" },
];

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);

// Computed properties
const filteredLessons = computed(() => {
  let result = lessons.value;

  if (selectedCourse.value) {
    // Filter lessons by course through unit relationship
    const courseUnits = units.value.filter(
      (unit) => unit.courseId === selectedCourse.value
    );
    const courseUnitIds = courseUnits.map((unit) => unit.id);
    result = result.filter((lesson) => {
      return courseUnitIds.includes(lesson.moduleId);
    });
  }

  if (selectedUnit.value) {
    result = result.filter((lesson) => lesson.moduleId === selectedUnit.value);
  }

  if (selectedLevel.value) {
    result = result.filter((lesson) => lesson.level === selectedLevel.value);
  }

  // Apply search query if present
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((lesson) =>
      lesson.title.toLowerCase().includes(query)
    );
  }

  return result;
});

const filteredVocabularyItems = computed(() => {
  let items = vocabularyItems.value;

  // Filter by vocabulary set if selected
  if (selectedVocabularySet.value) {
    items = items.filter((item) => item.set_id === selectedVocabularySet.value);
  }

  // Filter by level if selected
  if (selectedLevel.value) {
    items = items.filter((item) => item.level === selectedLevel.value);
  }

  // Apply search filter if present
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter(
      (item) =>
        item.word?.toLowerCase().includes(query) ||
        (item.uzbek || item.uzbekTranslation)?.toLowerCase().includes(query) ||
        (item.rus || item.russianTranslation)?.toLowerCase().includes(query)
    );
  }

  return items;
});

const availableUnits = computed(() => {
  if (!selectedCourse.value) return [];
  return units.value.filter((unit) => unit.courseId === selectedCourse.value);
});

const paginatedVocabularyItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredVocabularyItems.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredVocabularyItems.value.length / itemsPerPage.value);
});

// Methods
const fetchCourses = async () => {
  try {
    const response = await courseAPI.getAll();
    courses.value = Array.isArray(response) ? response : response.data || [];
  } catch (err) {
    console.error("Error fetching courses:", err);
    courses.value = [];
  }
};

const fetchUnits = async () => {
  try {
    const response = await unitsAPI.getAll();
    units.value = Array.isArray(response) ? response : response.data || [];
  } catch (err) {
    console.error("Error fetching units:", err);
    units.value = [];
  }
};

const fetchLessons = async () => {
  try {
    searchingLessons.value = true;
    const response = await lessonsAPI.getAll();
    lessons.value = Array.isArray(response) ? response : response.data || [];
  } catch (err) {
    console.error("Error fetching lessons:", err);
    error.value = "Failed to load lessons";
    lessons.value = [];
  } finally {
    searchingLessons.value = false;
  }
};

const fetchVocabularySets = async () => {
  try {
    isLoading.value = true;
    const response = await vocabularyAPI.getAll();
    vocabularySets.value = Array.isArray(response)
      ? response
      : response.data || [];
  } catch (err) {
    console.error("Error fetching vocabulary sets:", err);
    error.value = "Failed to load vocabulary sets";
    vocabularySets.value = [];
  } finally {
    isLoading.value = false;
  }
};

const fetchVocabularyItems = async (setId = null) => {
  try {
    searchingVocabItems.value = true;
    let response;

    if (setId) {
      response = await vocabularyItemsAPI.getBySetId(setId);
    } else {
      response = await vocabularyItemsAPI.getAll();
    }

    vocabularyItems.value = Array.isArray(response)
      ? response
      : response.data || [];
  } catch (err) {
    console.error("Error fetching vocabulary items:", err);
    error.value = "Failed to load vocabulary items";
    vocabularyItems.value = [];
  } finally {
    searchingVocabItems.value = false;
  }
};

const selectLesson = async (lesson) => {
  selectedLesson.value = lesson;
  await fetchAssignedVocabularies(lesson.id);
};

const openAssignModal = () => {
  if (!selectedLesson.value) {
    error.value = "Please select a lesson first";
    return;
  }

  selectedVocabularyItems.value = [];
  showAssignModal.value = true;
};

const closeAssignModal = () => {
  showAssignModal.value = false;
  selectedVocabularyItems.value = [];
};

// Function to toggle vocabulary item selection
const toggleVocabularySelection = (item) => {
  const index = selectedVocabularyItems.value.findIndex(
    (i) => i.id === item.id
  );
  if (index === -1) {
    selectedVocabularyItems.value.push(item);
  } else {
    selectedVocabularyItems.value.splice(index, 1);
  }
};

// Function to check if a vocabulary item is selected
const isVocabularySelected = (item) => {
  return selectedVocabularyItems.value.some((i) => i.id === item.id);
};

// Function to check if a vocabulary item is already assigned to the current lesson
const isVocabularyAssigned = (item) => {
  return assignedVocabularies.value.some(
    (i) => i.vocabulary_item_id === item.id
  );
};

// Get vocabularies assigned to a lesson
const fetchAssignedVocabularies = async (lessonId) => {
  try {
    assignmentsLoading.value = true;
    // Use the imported lessonVocabularyAPI instead of the local one
    const response = await lessonVocabularyAPI.getByLessonId(lessonId);
    assignedVocabularies.value = Array.isArray(response)
      ? response
      : response.data || [];
  } catch (err) {
    console.error("Error fetching assigned vocabularies:", err);
    error.value = "Failed to load assigned vocabularies";
    assignedVocabularies.value = [];
  } finally {
    assignmentsLoading.value = false;
  }
};

// Assign vocabulary items to the selected lesson
const assignVocabulariesToLesson = async () => {
  if (!selectedLesson.value || selectedVocabularyItems.value.length === 0) {
    error.value = "Please select a lesson and at least one vocabulary item";
    return;
  }

  try {
    isLoading.value = true;

    // Process each vocabulary item one by one
    for (const item of selectedVocabularyItems.value) {
      const assignmentData = {
        lesson_id: selectedLesson.value.id,
        vocabulary_item_id: item.id,
      };

      // Create individual assignment using create method
      await lessonVocabularyAPI.create(assignmentData);
    }

    // Refresh the assigned vocabularies
    await fetchAssignedVocabularies(selectedLesson.value.id);

    closeAssignModal();
  } catch (err) {
    console.error("Error assigning vocabularies:", err);
    error.value = "Failed to assign vocabularies to the lesson";
  } finally {
    isLoading.value = false;
  }
};

// Remove vocabulary assignment from the selected lesson
const removeVocabularyAssignment = async (assignmentId) => {
  try {
    isLoading.value = true;

    // Call API to remove the assignment
    await lessonVocabularyAPI.delete(assignmentId);

    // Update UI
    assignedVocabularies.value = assignedVocabularies.value.filter(
      (assignment) => assignment.id !== assignmentId
    );
  } catch (err) {
    console.error("Error removing vocabulary assignment:", err);
    error.value = "Failed to remove vocabulary assignment";
  } finally {
    isLoading.value = false;
  }
};

// Pagination methods
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

// Reset filters
const resetFilters = () => {
  selectedCourse.value = "";
  selectedUnit.value = "";
  selectedLevel.value = "";
  selectedVocabularySet.value = null;
  searchQuery.value = "";
  currentPage.value = 1;
};

// Watch for filter changes
watch(
  [
    selectedCourse,
    selectedUnit,
    selectedLevel,
    selectedVocabularySet,
    searchQuery,
  ],
  () => {
    currentPage.value = 1;
  }
);

// Initialize
onMounted(async () => {
  await Promise.all([
    fetchCourses(),
    fetchUnits(),
    fetchLessons(),
    fetchVocabularySets(),
    fetchVocabularyItems(),
  ]);
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Lesson Vocabulary</h1>
          <p class="text-gray-600">Assign vocabulary items to lessons</p>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
    >
      {{ error }}
      <button
        @click="error = ''"
        class="float-right text-red-500 hover:text-red-700"
      >
        ×
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <!-- Search -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Search</label
          >
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Course Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Course</label
          >
          <select
            v-model="selectedCourse"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Courses</option>
            <option
              v-for="course in courses"
              :key="course.id"
              :value="course.id"
            >
              {{ course.title }}
            </option>
          </select>
        </div>

        <!-- Unit Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Unit</label
          >
          <select
            v-model="selectedUnit"
            :disabled="!selectedCourse"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">All Units</option>
            <option
              v-for="unit in availableUnits"
              :key="unit.id"
              :value="unit.id"
            >
              {{ unit.title }}
            </option>
          </select>
        </div>

        <!-- Level Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Level</label
          >
          <select
            v-model="selectedLevel"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Levels</option>
            <option
              v-for="level in languageLevels"
              :key="level.value"
              :value="level.value"
            >
              {{ level.label }}
            </option>
          </select>
        </div>

        <!-- Reset Filter Button -->
        <div class="flex items-end">
          <button
            @click="resetFilters"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 w-full"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Lessons Panel -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-gray-800 mb-2">Lessons</h2>
          <div class="relative">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search lessons..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div
              v-if="searchingLessons"
              class="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <i class="fas fa-spinner fa-spin text-gray-400"></i>
            </div>
          </div>
        </div>

        <!-- Lessons List -->
        <div class="max-h-96 overflow-y-auto">
          <div
            v-if="filteredLessons.length === 0 && !searchingLessons"
            class="text-center py-8 text-gray-500"
          >
            No lessons available
          </div>
          <div
            v-else
            v-for="lesson in filteredLessons"
            :key="lesson.id"
            @click="selectLesson(lesson)"
            :class="[
              'p-3 rounded-md cursor-pointer transition-colors mb-2',
              selectedLesson && selectedLesson.id === lesson.id
                ? 'bg-blue-100 border border-blue-300'
                : 'hover:bg-gray-50 border border-gray-200',
            ]"
          >
            <h3 class="font-medium text-gray-800">{{ lesson.title }}</h3>
            <div class="flex items-center text-sm text-gray-500 mt-1">
              <span class="mr-2">Order: {{ lesson.order || "N/A" }}</span>
              <span v-if="lesson.level" class="mr-2"
                >Level: {{ lesson.level }}</span
              >
              <span
                :class="[
                  'px-2 py-0.5 rounded-full text-xs',
                  lesson.type === 'lesson'
                    ? 'bg-blue-100 text-blue-800'
                    : lesson.type === 'practice'
                      ? 'bg-green-100 text-green-800'
                      : lesson.type === 'test'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800',
                ]"
              >
                {{ lesson.type || "Unknown" }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Selected Lesson Details -->
      <div class="bg-white rounded-lg shadow p-4 md:col-span-2">
        <div v-if="!selectedLesson" class="text-center py-12">
          <div class="text-gray-400 mb-4">
            <i class="fas fa-book text-6xl"></i>
          </div>
          <h2 class="text-xl font-medium text-gray-700 mb-2">
            No lesson selected
          </h2>
          <p class="text-gray-500">
            Select a lesson from the left panel to view and manage its
            vocabulary
          </p>
        </div>

        <div v-else>
          <div class="flex justify-between items-start mb-6">
            <div>
              <h2 class="text-xl font-semibold text-gray-800">
                {{ selectedLesson.title }}
              </h2>
              <p class="text-gray-600">
                Type: {{ selectedLesson.type || "Unknown" }} | Order:
                {{ selectedLesson.order || "N/A" }}
              </p>
            </div>
            <button
              @click="openAssignModal"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <i class="fas fa-plus mr-2"></i>Assign Vocabulary
            </button>
          </div>

          <!-- Assigned Vocabulary -->
          <div>
            <h3 class="text-lg font-medium text-gray-800 mb-3">
              Assigned Vocabulary
            </h3>

            <div v-if="assignmentsLoading" class="text-center py-6">
              <i class="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
              <p class="text-gray-500">Loading assigned vocabulary...</p>
            </div>

            <div
              v-else-if="assignedVocabularies.length === 0"
              class="text-center py-6 border border-dashed border-gray-300 rounded-lg"
            >
              <i class="fas fa-list-ul text-gray-400 text-2xl mb-2"></i>
              <p class="text-gray-500">
                No vocabulary items assigned to this lesson
              </p>
              <button
                @click="openAssignModal"
                class="mt-3 px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
              >
                <i class="fas fa-plus mr-1"></i>Assign Vocabulary
              </button>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="assignment in assignedVocabularies"
                :key="assignment.id"
                class="flex justify-between items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <!-- Vocab item details would come from a join query in the backend -->
                <div>
                  <div class="font-medium">
                    {{ assignment?.vocabulary_set?.word }}
                  </div>
                  <div class="text-sm text-gray-500">
                    <!-- Add details once we have them from the backend -->
                  </div>
                </div>
                <button
                  @click="removeVocabularyAssignment(assignment.id)"
                  class="text-red-600 hover:text-red-800"
                  title="Remove assignment"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Assignment Modal -->
    <div
      v-if="showAssignModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    >
      <div
        class="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white"
      >
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">
              Assign Vocabulary to "{{
                selectedLesson ? selectedLesson.title : ""
              }}"
            </h3>
            <button
              @click="closeAssignModal"
              class="text-gray-400 hover:text-gray-600"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="space-y-4">
            <!-- Filters -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Search Vocabulary</label
                >
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search vocabulary items..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Vocabulary Set</label
                >
                <select
                  v-model="selectedVocabularySet"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option :value="null">All Sets</option>
                  <option
                    v-for="set in vocabularySets"
                    :key="set.id"
                    :value="set.id"
                  >
                    {{ set.title || "Unnamed Set" }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Level</label
                >
                <select
                  v-model="selectedLevel"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Levels</option>
                  <option
                    v-for="level in languageLevels"
                    :key="level.value"
                    :value="level.value"
                  >
                    {{ level.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="searchingVocabItems" class="text-center py-8">
              <i class="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
              <p class="text-gray-500">Loading vocabulary items...</p>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="filteredVocabularyItems.length === 0"
              class="text-center py-12"
            >
              <div class="text-gray-400 mb-4">
                <i class="fas fa-search text-6xl"></i>
              </div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">
                No vocabulary items found
              </h3>
              <p class="text-gray-500">
                Try adjusting your search or filter criteria
              </p>
            </div>

            <!-- Vocabulary Items List -->
            <div
              v-else
              class="border border-gray-200 rounded-lg overflow-hidden"
            >
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <input
                        type="checkbox"
                        @change="
                          $event.target.checked
                            ? (selectedVocabularyItems = [
                                ...filteredVocabularyItems,
                              ])
                            : (selectedVocabularyItems = [])
                        "
                        :checked="
                          selectedVocabularyItems.length > 0 &&
                          selectedVocabularyItems.length ===
                            filteredVocabularyItems.length
                        "
                        :indeterminate="
                          selectedVocabularyItems.length > 0 &&
                          selectedVocabularyItems.length <
                            filteredVocabularyItems.length
                        "
                        class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th
                      scope="col"
                      class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Word
                    </th>
                    <th
                      scope="col"
                      class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Translations
                    </th>
                    <th
                      scope="col"
                      class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr
                    v-for="item in paginatedVocabularyItems"
                    :key="item.id"
                    :class="{ 'bg-blue-50': isVocabularySelected(item) }"
                    @click="toggleVocabularySelection(item)"
                    class="hover:bg-gray-50 cursor-pointer"
                  >
                    <td class="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        :checked="isVocabularySelected(item)"
                        @click.stop
                        class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-gray-900">
                        {{ item.word || "Unknown" }}
                      </div>
                      <div
                        v-if="item.example"
                        class="text-sm text-gray-500 truncate max-w-xs"
                      >
                        {{ item.example }}
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="text-sm text-gray-900">
                        <span
                          v-if="item.uzbek || item.uzbekTranslation"
                          class="inline-block mr-2"
                        >
                          <span class="font-medium text-gray-700">UZ:</span>
                          {{ item.uzbek || item.uzbekTranslation }}
                        </span>
                        <span v-if="item.rus || item.russianTranslation">
                          <span class="font-medium text-gray-700">RU:</span>
                          {{ item.rus || item.russianTranslation }}
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        v-if="isVocabularyAssigned(item)"
                        class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800"
                      >
                        Already Assigned
                      </span>
                      <span
                        v-else-if="isVocabularySelected(item)"
                        class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                      >
                        Selected
                      </span>
                      <span
                        v-else
                        class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800"
                      >
                        Not Assigned
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div v-if="totalPages > 1" class="flex justify-center space-x-1">
              <button
                @click="previousPage"
                :disabled="currentPage === 1"
                class="px-3 py-1 rounded text-sm border"
                :class="
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                "
              >
                <i class="fas fa-chevron-left"></i>
              </button>

              <template v-for="page in Math.min(totalPages, 5)" :key="page">
                <button
                  @click="goToPage(page)"
                  class="px-3 py-1 rounded text-sm border"
                  :class="
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  "
                >
                  {{ page }}
                </button>
              </template>

              <button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                class="px-3 py-1 rounded text-sm border"
                :class="
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                "
              >
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>

            <!-- Selected Vocabulary Summary -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-medium text-gray-900 mb-2">
                Selected Items: {{ selectedVocabularyItems.length }}
              </h4>
              <div class="max-h-20 overflow-y-auto">
                <div
                  v-if="selectedVocabularyItems.length === 0"
                  class="text-sm text-gray-500"
                >
                  No vocabulary items selected
                </div>
                <div v-else class="flex flex-wrap gap-2">
                  <span
                    v-for="item in selectedVocabularyItems"
                    :key="item.id"
                    class="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center"
                  >
                    {{ item.word }}
                    <button
                      @click.stop="toggleVocabularySelection(item)"
                      class="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <i class="fas fa-times-circle"></i>
                    </button>
                  </span>
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeAssignModal"
                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                @click="assignVocabulariesToLesson"
                :disabled="selectedVocabularyItems.length === 0 || isLoading"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
                Assign {{ selectedVocabularyItems.length }} Items
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
