<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { speakingAPI, lessonsAPI, unitsAPI, courseAPI } from "@/utils/api.js";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";

// Shadcn Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Lucide Icons
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Mic,
  Volume2,
  X,
  MoreHorizontal,
  AlertCircle,
  RefreshCw,
  Eye,
} from "lucide-vue-next";

const isLoading = ref(false);
const error = ref("");
const searchQuery = ref("");
const showModal = ref(false);
const isEditMode = ref(false);

// Data
const speakingExercises = ref([]);
const courses = ref([]);
const units = ref([]);
const lessons = ref([]);
const selectedCourse = ref(null);
const selectedUnit = ref(null);
const selectedLesson = ref(null);

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);
const totalPages = computed(() =>
  Math.ceil(filteredSpeakingExercises.value.length / itemsPerPage.value)
);

// Form data
const form = reactive({
  id: null,
  title: "",
  type: "speaking",
  courseId: null,
  unitId: null,
  lessonId: null,
});

// Speaking exercise types
const speakingTypes = [
  { value: "speaking", label: "Speaking", icon: Mic },
  { value: "pronunciation", label: "Pronunciation", icon: Volume2 },
];

// Computed properties
const filteredSpeakingExercises = computed(() => {
  let result = speakingExercises.value;

  if (selectedCourse.value) {
    // Filter by course through lesson relationship
    const courseLessons = lessons.value.filter((lesson) => {
      const unit = units.value.find((u) => u.id === lesson.moduleId);
      return unit && unit.courseId === selectedCourse.value;
    });
    const courseLessonIds = courseLessons.map((lesson) => lesson.id);
    result = result.filter((exercise) =>
      courseLessonIds.includes(exercise.lessonId)
    );
  }

  if (selectedUnit.value) {
    // Filter by unit through lesson relationship
    const unitLessons = lessons.value.filter(
      (lesson) => lesson.moduleId === selectedUnit.value
    );
    const unitLessonIds = unitLessons.map((lesson) => lesson.id);
    result = result.filter((exercise) =>
      unitLessonIds.includes(exercise.lessonId)
    );
  }

  if (selectedLesson.value) {
    result = result.filter(
      (exercise) => exercise.lessonId === selectedLesson.value
    );
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (exercise) =>
        exercise.title?.toLowerCase().includes(query) ||
        exercise.type?.toLowerCase().includes(query)
    );
  }

  return result;
});

const paginatedSpeakingExercises = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredSpeakingExercises.value.slice(start, end);
});

// Filtered options for selects
const filteredUnits = computed(() => {
  if (!selectedCourse.value) return units.value;
  return units.value.filter((unit) => unit.courseId === selectedCourse.value);
});

const filteredLessons = computed(() => {
  if (!selectedUnit.value) return lessons.value;
  return lessons.value.filter(
    (lesson) => lesson.moduleId === selectedUnit.value
  );
});

// Methods
const fetchSpeakingExercises = async () => {
  try {
    isLoading.value = true;
    error.value = "";
    const response = await speakingAPI.getAll();
    // Sort by createdAt in ascending order (oldest first)
    speakingExercises.value = (response || []).sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  } catch (err) {
    error.value = "Failed to fetch speaking exercises";
    console.error("Error fetching speaking exercises:", err);
  } finally {
    isLoading.value = false;
  }
};

const fetchCourses = async () => {
  try {
    const response = await courseAPI.getAll();
    courses.value = response || [];
  } catch (err) {
    console.error("Error fetching courses:", err);
  }
};

const fetchUnits = async () => {
  try {
    const response = await unitsAPI.getAll();
    units.value = response || [];
  } catch (err) {
    console.error("Error fetching units:", err);
  }
};

const fetchLessons = async () => {
  try {
    const response = await lessonsAPI.getAll();
    lessons.value = response || [];
  } catch (err) {
    console.error("Error fetching lessons:", err);
  }
};

const resetForm = () => {
  Object.assign(form, {
    id: null,
    title: "",
    type: "speaking",
    courseId: null,
    unitId: null,
    lessonId: null,
  });
};

const openModal = () => {
  resetForm();
  isEditMode.value = false;
  showModal.value = true;
};

const openEditModal = (exercise) => {
  Object.assign(form, {
    ...exercise,
    courseId: getCourseIdFromLesson(exercise.lessonId),
    unitId: getUnitIdFromLesson(exercise.lessonId),
  });
  isEditMode.value = true;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  resetForm();
};

const getCourseIdFromLesson = (lessonId) => {
  const lesson = lessons.value.find((l) => l.id === lessonId);
  if (!lesson) return null;
  const unit = units.value.find((u) => u.id === lesson.moduleId);
  return unit?.courseId || null;
};

const getUnitIdFromLesson = (lessonId) => {
  const lesson = lessons.value.find((l) => l.id === lessonId);
  return lesson?.moduleId || null;
};

const getLessonTitle = (lessonId) => {
  const lesson = lessons.value.find((l) => l.id === lessonId);
  return lesson?.title || "Unknown Lesson";
};

const getUnitTitle = (lessonId) => {
  const lesson = lessons.value.find((l) => l.id === lessonId);
  if (!lesson) return "Unknown Unit";
  const unit = units.value.find((u) => u.id === lesson.moduleId);
  return unit?.title || "Unknown Unit";
};

const getCourseTitle = (lessonId) => {
  const lesson = lessons.value.find((l) => l.id === lessonId);
  if (!lesson) return "Unknown Course";
  const unit = units.value.find((u) => u.id === lesson.moduleId);
  if (!unit) return "Unknown Course";
  const course = courses.value.find((c) => c.id === unit.courseId);
  return course?.title || "Unknown Course";
};

const submitForm = async () => {
  try {
    if (!form.title.trim() || !form.lessonId) {
      error.value = "Please fill in all required fields";
      return;
    }

    isLoading.value = true;
    error.value = "";

    const speakingData = {
      title: form.title.trim(),
      type: form.type,
      lessonId: form.lessonId,
    };

    if (isEditMode.value) {
      await speakingAPI.update(form.id, speakingData);
    } else {
      await speakingAPI.create(speakingData);
    }

    await fetchSpeakingExercises();
    closeModal();
  } catch (err) {
    error.value = isEditMode.value
      ? "Failed to update speaking exercise"
      : "Failed to create speaking exercise";
    console.error("Error submitting form:", err);
  } finally {
    isLoading.value = false;
  }
};

const deleteSpeakingExercise = async (id) => {
  if (!confirm("Are you sure you want to delete this speaking exercise?"))
    return;

  try {
    isLoading.value = true;
    error.value = "";
    await speakingAPI.delete(id);
    await fetchSpeakingExercises();
  } catch (err) {
    error.value = "Failed to delete speaking exercise";
    console.error("Error deleting speaking exercise:", err);
  } finally {
    isLoading.value = false;
  }
};

const clearFilters = () => {
  selectedCourse.value = null;
  selectedUnit.value = null;
  selectedLesson.value = null;
  searchQuery.value = "";
};

// Watch for course/unit selection changes
watch(selectedCourse, (newVal) => {
  if (!newVal) {
    selectedUnit.value = null;
    selectedLesson.value = null;
  }
});

watch(selectedUnit, (newVal) => {
  if (!newVal) {
    selectedLesson.value = null;
  }
});

// Form watchers
watch(
  () => form.courseId,
  (newVal) => {
    if (newVal) {
      form.unitId = null;
      form.lessonId = null;
    }
  }
);

watch(
  () => form.unitId,
  (newVal) => {
    if (newVal) {
      form.lessonId = null;
    }
  }
);

// Initialize data
onMounted(() => {
  fetchSpeakingExercises();
  fetchCourses();
  fetchUnits();
  fetchLessons();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Speaking Exercises</h1>
        <p class="text-muted-foreground">
          Manage speaking practice exercises and conversation prompts
        </p>
      </div>
      <Button @click="openModal" class="flex items-center gap-2">
        <Plus class="w-4 h-4" />
        Add Speaking Exercise
      </Button>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive" class="mb-6">
      <AlertCircle class="w-4 h-4" />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Filters and Search -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Filter class="w-4 h-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Search -->
          <div class="space-y-2">
            <Label>Search</Label>
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
              />
              <Input
                v-model="searchQuery"
                placeholder="Search speaking exercises..."
                class="pl-10"
              />
            </div>
          </div>

          <!-- Course Filter -->
          <div class="space-y-2">
            <Label>Course</Label>
            <Select v-model="selectedCourse">
              <SelectTrigger>
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="null">All courses</SelectItem>
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
          <div class="space-y-2">
            <Label>Unit</Label>
            <Select v-model="selectedUnit" :disabled="!selectedCourse">
              <SelectTrigger>
                <SelectValue placeholder="All units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="null">All units</SelectItem>
                <SelectItem
                  v-for="unit in filteredUnits"
                  :key="unit.id"
                  :value="unit.id"
                >
                  {{ unit.title }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Lesson Filter -->
          <div class="space-y-2">
            <Label>Lesson</Label>
            <Select v-model="selectedLesson" :disabled="!selectedUnit">
              <SelectTrigger>
                <SelectValue placeholder="All lessons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="null">All lessons</SelectItem>
                <SelectItem
                  v-for="lesson in filteredLessons"
                  :key="lesson.id"
                  :value="lesson.id"
                >
                  {{ lesson.title }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Clear Filters -->
        <div class="flex justify-end">
          <Button
            variant="outline"
            @click="clearFilters"
            class="flex items-center gap-2"
          >
            <X class="w-4 h-4" />
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Speaking Exercises Table -->
    <Card>
      <CardHeader>
        <CardTitle
          >Speaking Exercises ({{
            filteredSpeakingExercises.length
          }})</CardTitle
        >
      </CardHeader>
      <CardContent>
        <div v-if="isLoading" class="space-y-3">
          <Skeleton v-for="i in 5" :key="i" class="h-16 w-full" />
        </div>

        <div
          v-else-if="filteredSpeakingExercises.length === 0"
          class="text-center py-8"
        >
          <Mic class="mx-auto w-12 h-12 text-gray-400 mb-4" />
          <p class="text-lg font-medium text-gray-900">
            No speaking exercises found
          </p>
          <p class="text-gray-600">
            Create your first speaking exercise to get started.
          </p>
        </div>

        <div v-else>
          <!-- Desktop view with table -->
          <div class="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Lesson</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="exercise in paginatedSpeakingExercises"
                  :key="exercise.id"
                >
                  <TableCell class="font-medium">
                    {{ exercise.title }}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" class="capitalize">
                      {{ exercise.type || "speaking" }}
                    </Badge>
                  </TableCell>
                  <TableCell>{{ getCourseTitle(exercise.lessonId) }}</TableCell>
                  <TableCell>{{ getUnitTitle(exercise.lessonId) }}</TableCell>
                  <TableCell>{{ getLessonTitle(exercise.lessonId) }}</TableCell>
                  <TableCell class="text-right">
                    <div class="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        @click="
                          exercise.type === 'pronunciation'
                            ? $router.push(`/pronunciation/${exercise.id}`)
                            : $router.push(`/speaking/${exercise.id}`)
                        "
                        class="flex items-center gap-1"
                      >
                        <Eye class="h-3 w-3" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" class="h-8 w-8 p-0">
                            <MoreHorizontal class="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            @click="
                              exercise.type === 'pronunciation'
                                ? $router.push(`/pronunciation/${exercise.id}`)
                                : $router.push(`/speaking/${exercise.id}`)
                            "
                          >
                            <Eye class="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem @click="openEditModal(exercise)">
                            <Edit class="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            @click="deleteSpeakingExercise(exercise.id)"
                            class="text-red-600"
                          >
                            <Trash2 class="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Mobile view with cards -->
          <div class="md:hidden">
            <div class="grid gap-4 sm:grid-cols-2">
              <Card
                v-for="exercise in paginatedSpeakingExercises"
                :key="exercise.id"
                class="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div class="flex items-start justify-between">
                    <div class="space-y-1">
                      <CardTitle class="text-lg">{{
                        exercise.title
                      }}</CardTitle>
                      <CardDescription>
                        <Badge variant="secondary" class="capitalize">
                          {{ exercise.type || "speaking" }}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div class="space-y-2 text-sm text-muted-foreground">
                    <div class="flex items-center justify-between">
                      <span class="font-medium">Course:</span>
                      <span>{{ getCourseTitle(exercise.lessonId) }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="font-medium">Unit:</span>
                      <span>{{ getUnitTitle(exercise.lessonId) }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="font-medium">Lesson:</span>
                      <span>{{ getLessonTitle(exercise.lessonId) }}</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter class="gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    class="flex-1"
                    @click="
                      exercise.type === 'pronunciation'
                        ? $router.push(`/pronunciation/${exercise.id}`)
                        : $router.push(`/speaking/${exercise.id}`)
                    "
                  >
                    <Eye class="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="editExercise(exercise)"
                  >
                    <Edit class="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="deleteExercise(exercise.id)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>

          <!-- Pagination -->
          <div
            class="flex items-center justify-between space-x-2 py-4"
            v-if="totalPages > 1"
          >
            <div class="text-sm text-muted-foreground">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
              {{
                Math.min(
                  currentPage * itemsPerPage,
                  filteredSpeakingExercises.length
                )
              }}
              of {{ filteredSpeakingExercises.length }} results
            </div>
            <div class="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="currentPage === 1"
                @click="currentPage--"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="currentPage === totalPages"
                @click="currentPage++"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Speaking Exercise Modal -->
    <Dialog :open="showModal" @update:open="closeModal">
      <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            >{{ isEditMode ? "Edit" : "Create" }} Speaking Exercise</DialogTitle
          >
          <DialogDescription>
            {{
              isEditMode
                ? "Update the speaking exercise details."
                : "Create a new speaking exercise for language practice."
            }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="submitForm" class="space-y-6">
          <div class="space-y-4">
            <!-- Title -->
            <div class="space-y-2">
              <Label for="title">Title *</Label>
              <Input
                id="title"
                v-model="form.title"
                placeholder="Enter speaking exercise title"
                required
              />
            </div>

            <!-- Type -->
            <div class="space-y-2">
              <Label for="type">Type *</Label>
              <Select v-model="form.type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="type in speakingTypes"
                    :key="type.value"
                    :value="type.value"
                  >
                    <div class="flex items-center gap-2">
                      <component :is="type.icon" class="w-4 h-4" />
                      {{ type.label }}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Course -->
            <div class="space-y-2">
              <Label for="course">Course *</Label>
              <Select v-model="form.courseId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
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

            <!-- Unit -->
            <div class="space-y-2">
              <Label for="unit">Unit *</Label>
              <Select v-model="form.unitId" :disabled="!form.courseId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="unit in units.filter(
                      (u) => u.courseId === form.courseId
                    )"
                    :key="unit.id"
                    :value="unit.id"
                  >
                    {{ unit.title }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Lesson -->
            <div class="space-y-2">
              <Label for="lesson">Lesson *</Label>
              <Select v-model="form.lessonId" :disabled="!form.unitId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select lesson" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="lesson in lessons.filter(
                      (l) => l.moduleId === form.unitId
                    )"
                    :key="lesson.id"
                    :value="lesson.id"
                  >
                    {{ lesson.title }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              @click="closeModal"
              :disabled="isLoading"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              :disabled="isLoading"
              class="flex items-center gap-2"
            >
              <RefreshCw v-if="isLoading" class="w-4 h-4 animate-spin" />
              {{ isEditMode ? "Update" : "Create" }} Speaking Exercise
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
