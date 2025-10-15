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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { BookOpen, Plus, X, Search, Loader2, AlertCircle, ChevronLeft, ChevronRight, List } from 'lucide-vue-next'

// State
const isLoading = ref(false);
const error = ref("");
const searchQuery = ref("");
const selectedLesson = ref(null);
const selectedVocabularySet = ref(null);
const selectedCourse = ref("all");
const selectedUnit = ref("all");
const selectedLevel = ref("all");
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

  if (selectedCourse.value && selectedCourse.value !== 'all') {
    // Filter lessons by course through unit relationship
    const courseUnits = units.value.filter(
      (unit) => unit.courseId === selectedCourse.value
    );
    const courseUnitIds = courseUnits.map((unit) => unit.id);
    result = result.filter((lesson) => {
      return courseUnitIds.includes(lesson.moduleId);
    });
  }

  if (selectedUnit.value && selectedUnit.value !== 'all') {
    result = result.filter((lesson) => lesson.moduleId === selectedUnit.value);
  }

  if (selectedLevel.value && selectedLevel.value !== 'all') {
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
  if (selectedLevel.value && selectedLevel.value !== 'all') {
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
  if (!selectedCourse.value || selectedCourse.value === 'all') return [];
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
  selectedCourse.value = "all";
  selectedUnit.value = "all";
  selectedLevel.value = "all";
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
          <h1 class="text-2xl font-bold">Lesson Vocabulary</h1>
          <p class="text-muted-foreground">Assign vocabulary items to lessons</p>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive" class="mb-4">
      <AlertCircle class="h-4 w-4" />
      <AlertDescription class="flex items-center justify-between">
        <span>{{ error }}</span>
        <Button @click="error = ''" variant="ghost" size="sm" class="h-auto p-0">
          <X class="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>

    <!-- Filters -->
    <Card class="mb-6">
      <CardContent class="p-4">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <!-- Search -->
          <div>
            <Label>Search</Label>
            <Input
              type="text"
              v-model="searchQuery"
              placeholder="Search..."
            />
          </div>

          <!-- Course Filter -->
          <div>
            <Label>Course</Label>
            <Select v-model="selectedCourse">
              <SelectTrigger>
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem
                  v-for="course in courses"
                  :key="course.id"
                  :value="course.id"
                >
                  {{ course.title }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Unit Filter -->
          <div>
            <Label>Unit</Label>
            <Select v-model="selectedUnit" :disabled="selectedCourse === 'all'">
              <SelectTrigger :disabled="selectedCourse === 'all'">
                <SelectValue placeholder="All Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                <SelectItem
                  v-for="unit in availableUnits"
                  :key="unit.id"
                  :value="unit.id"
                >
                  {{ unit.title }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>


          <!-- Reset Filter Button -->
          <div class="flex items-end">
            <Button
              @click="resetFilters"
              variant="outline"
              class="w-full"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Main Content -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Lessons Panel -->
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">Lessons</CardTitle>
          <div class="relative mt-2">
            <Input
              type="text"
              v-model="searchQuery"
              placeholder="Search lessons..."
            />
            <div
              v-if="searchingLessons"
              class="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        </CardHeader>

        <!-- Lessons List -->
        <CardContent class="max-h-96 overflow-y-auto">
          <div
            v-if="filteredLessons.length === 0 && !searchingLessons"
            class="text-center py-8 text-muted-foreground"
          >
            No lessons available
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="lesson in filteredLessons"
              :key="lesson.id"
              @click="selectLesson(lesson)"
              :class="[
                'p-3 rounded-md cursor-pointer transition-colors border',
                selectedLesson && selectedLesson.id === lesson.id
                  ? 'bg-primary/10 border-primary'
                  : 'hover:bg-muted border-border',
              ]"
            >
              <h3 class="font-medium">{{ lesson.title }}</h3>
              <div class="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <span>Order: {{ lesson.order || "N/A" }}</span>
                <span v-if="lesson.level">Level: {{ lesson.level }}</span>
                <Badge
                  :variant="
                    lesson.type === 'lesson'
                      ? 'default'
                      : lesson.type === 'practice'
                        ? 'secondary'
                        : lesson.type === 'test'
                          ? 'destructive'
                          : 'outline'
                  "
                >
                  {{ lesson.type || "Unknown" }}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Selected Lesson Details -->
      <Card class="md:col-span-2">
        <CardContent class="p-4">
          <div v-if="!selectedLesson" class="text-center py-12">
            <div class="text-muted-foreground mb-4">
              <BookOpen class="h-16 w-16 mx-auto" />
            </div>
            <h2 class="text-xl font-medium mb-2">
              No lesson selected
            </h2>
            <p class="text-muted-foreground">
              Select a lesson from the left panel to view and manage its
              vocabulary
            </p>
          </div>

          <div v-else>
            <div class="flex justify-between items-start mb-6">
              <div>
                <h2 class="text-xl font-semibold">
                  {{ selectedLesson.title }}
                </h2>
                <p class="text-muted-foreground">
                  Type: {{ selectedLesson.type || "Unknown" }} | Order:
                  {{ selectedLesson.order || "N/A" }}
                </p>
              </div>
              <Button @click="openAssignModal" class="gap-2">
                <Plus class="h-4 w-4" />
                Assign Vocabulary
              </Button>
            </div>

            <!-- Assigned Vocabulary -->
            <div>
              <h3 class="text-lg font-medium mb-3">
                Assigned Vocabulary
              </h3>

              <div v-if="assignmentsLoading" class="text-center py-6">
                <Loader2 class="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                <p class="text-muted-foreground">Loading assigned vocabulary...</p>
              </div>

              <div
                v-else-if="assignedVocabularies.length === 0"
                class="text-center py-6 border border-dashed rounded-lg"
              >
                <List class="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p class="text-muted-foreground">
                  No vocabulary items assigned to this lesson
                </p>
                <Button
                  @click="openAssignModal"
                  variant="outline"
                  class="mt-3 gap-1"
                >
                  <Plus class="h-4 w-4" />
                  Assign Vocabulary
                </Button>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="assignment in assignedVocabularies"
                  :key="assignment.id"
                  class="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50"
                >
                  <!-- Vocab item details would come from a join query in the backend -->
                  <div>
                    <div class="font-medium">
                      {{ assignment?.vocabulary_set?.word }}
                    </div>
                    <div class="text-sm text-muted-foreground">
                      <!-- Add details once we have them from the backend -->
                    </div>
                  </div>
                  <Button
                    @click="removeVocabularyAssignment(assignment.id)"
                    variant="ghost"
                    size="icon"
                    class="text-destructive hover:text-destructive"
                    title="Remove assignment"
                  >
                    <X class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Assignment Modal -->
    <Dialog :open="showAssignModal" @update:open="(open) => !open && closeAssignModal()">
      <DialogContent class="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Assign Vocabulary to "{{ selectedLesson ? selectedLesson.title : "" }}"
          </DialogTitle>
        </DialogHeader>

        <!-- Modal Body -->
        <div class="space-y-4">
          <!-- Filters -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Search Vocabulary</Label>
              <Input
                v-model="searchQuery"
                type="text"
                placeholder="Search vocabulary items..."
              />
            </div>
            <div>
              <Label>Vocabulary Set</Label>
              <Select v-model="selectedVocabularySet">
                <SelectTrigger>
                  <SelectValue placeholder="All Sets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="null">All Sets</SelectItem>
                  <SelectItem
                    v-for="set in vocabularySets"
                    :key="set.id"
                    :value="set.id"
                  >
                    {{ set.title || "Unnamed Set" }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="searchingVocabItems" class="text-center py-8">
            <Loader2 class="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
            <p class="text-muted-foreground">Loading vocabulary items...</p>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="filteredVocabularyItems.length === 0"
            class="text-center py-12"
          >
            <div class="text-muted-foreground mb-4">
              <Search class="h-16 w-16 mx-auto" />
            </div>
            <h3 class="text-lg font-medium mb-2">
              No vocabulary items found
            </h3>
            <p class="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>

          <!-- Vocabulary Items List -->
          <div v-else class="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-12">
                    <Checkbox
                      :checked="
                        selectedVocabularyItems.length > 0 &&
                        selectedVocabularyItems.length === filteredVocabularyItems.length
                      "
                      @update:checked="(checked) => 
                        checked
                          ? (selectedVocabularyItems = [...filteredVocabularyItems])
                          : (selectedVocabularyItems = [])
                      "
                    />
                  </TableHead>
                  <TableHead>Word</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="item in paginatedVocabularyItems"
                  :key="item.id"
                  :class="{ 'bg-muted/50': isVocabularySelected(item) }"
                  @click="toggleVocabularySelection(item)"
                  class="cursor-pointer"
                >
                  <TableCell>
                    <Checkbox
                      :checked="isVocabularySelected(item)"
                      @click.stop
                    />
                  </TableCell>
                  <TableCell>
                    <div class="font-medium">
                      {{ item.word || "Unknown" }}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      v-if="isVocabularyAssigned(item)"
                      variant="secondary"
                    >
                      Already Assigned
                    </Badge>
                    <Badge
                      v-else-if="isVocabularySelected(item)"
                      variant="default"
                    >
                      Selected
                    </Badge>
                    <Badge
                      v-else
                      variant="outline"
                    >
                      Not Assigned
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center gap-1">
            <Button
              @click="previousPage"
              :disabled="currentPage === 1"
              variant="outline"
              size="sm"
            >
              <ChevronLeft class="h-4 w-4" />
            </Button>

            <Button
              v-for="page in Math.min(totalPages, 5)"
              :key="page"
              @click="goToPage(page)"
              :variant="page === currentPage ? 'default' : 'outline'"
              size="sm"
            >
              {{ page }}
            </Button>

            <Button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              variant="outline"
              size="sm"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>

          <!-- Selected Vocabulary Summary -->
          <Card class="bg-muted/50">
            <CardContent class="p-4">
              <h4 class="font-medium mb-2">
                Selected Items: {{ selectedVocabularyItems.length }}
              </h4>
              <div class="max-h-20 overflow-y-auto">
                <div
                  v-if="selectedVocabularyItems.length === 0"
                  class="text-sm text-muted-foreground"
                >
                  No vocabulary items selected
                </div>
                <div v-else class="flex flex-wrap gap-2">
                  <Badge
                    v-for="item in selectedVocabularyItems"
                    :key="item.id"
                    variant="secondary"
                    class="gap-1"
                  >
                    {{ item.word }}
                    <Button
                      @click.stop="toggleVocabularySelection(item)"
                      variant="ghost"
                      size="sm"
                      class="h-auto p-0 hover:bg-transparent"
                    >
                      <X class="h-3 w-3" />
                    </Button>
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            type="button"
            @click="closeAssignModal"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            type="button"
            @click="assignVocabulariesToLesson"
            :disabled="selectedVocabularyItems.length === 0 || isLoading"
          >
            <Loader2 v-if="isLoading" class="h-4 w-4 mr-2 animate-spin" />
            Assign {{ selectedVocabularyItems.length }} Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
