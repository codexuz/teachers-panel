<template>
  <div class="container p-4 sm:p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex flex-col md:flex-row md:justify-between md:items-center">
        <div class="space-y-1">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
            Group Homework
          </h1>
          <p class="text-muted-foreground">
            Assign and manage homework for your groups
          </p>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="mb-6">
      <Alert variant="destructive" class="flex items-start">
        <AlertCircle class="h-4 w-4 mr-2 mt-0.5" />
        <div class="flex-1">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{{ error }}</AlertDescription>
        </div>
        <Button variant="ghost" size="icon" class="h-8 w-8" @click="error = ''">
          <X class="h-4 w-4" />
        </Button>
      </Alert>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="mb-6">
      <Alert
        class="flex items-start bg-green-50 border-green-200 text-green-800"
      >
        <Check class="h-4 w-4 mr-2 mt-0.5 text-green-600" />
        <div class="flex-1">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{{ successMessage }}</AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-green-700 hover:text-green-900"
          @click="successMessage = ''"
        >
          <X class="h-4 w-4" />
        </Button>
      </Alert>
    </div>

    <!-- Group Selection -->
    <Card class="mb-8">
      <CardHeader>
        <CardTitle class="flex items-center">
          <Users class="h-5 w-5 mr-2 text-primary" />
          Select a Group
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Group Selection -->
          <div class="space-y-2">
            <Label>Select Group</Label>
            <Select
              v-model="selectedGroupId"
              @update:model-value="handleGroupSelection"
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a group to manage homework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="null">Select a group</SelectItem>
                <SelectItem
                  v-for="group in filteredGroups"
                  :key="group.id"
                  :value="group.id"
                >
                  {{ group.name }} - {{ getCourseTitle(group.level_id) }} ({{
                    groupHomeworks[group.id]?.length || 0
                  }}
                  homework)
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="isLoading" class="text-sm text-muted-foreground">
              Loading groups...
            </p>
            <p
              v-else-if="groups.length === 0"
              class="text-sm text-muted-foreground"
            >
              No groups available
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Group Homework Management -->
    <Card v-if="selectedGroup" class="mb-8">
      <CardHeader>
        <div
          class="flex flex-col sm:flex-row sm:justify-between sm:items-center"
        >
          <CardTitle class="flex items-center">
            <ClipboardCheck class="h-5 w-5 mr-2 text-primary" />
            Group Homework Management
          </CardTitle>

          <!-- Search Homeworks -->
          <div class="relative flex-grow sm:max-w-md mt-4 sm:mt-0">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <Search class="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              v-model="homeworkSearchQuery"
              placeholder="Search by homework title..."
              class="pl-9"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <!-- Create New Homework Button -->
        <div class="mb-6">
          <Button
            @click="openHomeworkForm()"
            variant="default"
            class="flex items-center"
          >
            <Plus class="h-4 w-4 mr-2" />
            Create New Homework
          </Button>
        </div>

        <!-- Assigned Homeworks Section -->
        <div v-if="groupHomeworks[selectedGroup.id]?.length > 0" class="mb-8">
          <div class="flex items-center mb-3 pb-2 border-b">
            <CheckCircle2 class="h-4 w-4 text-primary mr-2" />
            <h3 class="font-medium">Homeworks for {{ selectedGroup.name }}</h3>
          </div>

          <div class="space-y-3">
            <Card
              v-for="homework in filteredHomeworks"
              :key="homework.id"
              class="hover:border-primary/30 hover:shadow-sm transition-all duration-200"
            >
              <CardContent class="p-4">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <h3 class="font-medium">{{ homework.title }}</h3>
                    <div
                      class="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm text-muted-foreground"
                    >
                      <div>
                        <span class="font-medium">Start Date:</span>
                        {{
                          homework.start_date
                            ? new Date(homework.start_date).toLocaleDateString()
                            : "Not set"
                        }}
                      </div>
                      <div>
                        <span class="font-medium">Deadline:</span>
                        {{
                          homework.deadline
                            ? new Date(homework.deadline).toLocaleDateString()
                            : "No deadline"
                        }}
                      </div>
                      <div>
                        <span class="font-medium">Lesson:</span>
                        {{
                          getLessonTitle(homework.lesson_id) ||
                          "General homework"
                        }}
                      </div>
                      <div>
                        <span class="font-medium">Status:</span>
                        <Badge
                          :variant="getStatusVariant(homework)"
                          class="ml-1"
                        >
                          {{ getStatusText(homework) }}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div class="flex space-x-2">
                    <Button
                      @click.stop="openHomeworkForm(homework)"
                      variant="ghost"
                      size="icon"
                      title="Edit Homework"
                    >
                      <Pencil class="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      @click.stop="deleteHomework(homework)"
                      variant="ghost"
                      size="icon"
                      title="Delete Homework"
                    >
                      <Trash2 class="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div
          v-else-if="!isLoading"
          class="text-center py-8 bg-muted/50 rounded-lg"
        >
          <ClipboardCheck
            class="h-16 w-16 mx-auto text-muted-foreground/70 mb-4"
          />
          <p class="text-muted-foreground">
            No homework assignments found for this group
          </p>
          <p class="text-muted-foreground/70 text-sm mt-1">
            Click "Create New Homework" to get started
          </p>
        </div>
      </CardContent>
    </Card>

    <!-- Homework Form Modal -->
    <Dialog :open="showHomeworkForm" @update:open="closeHomeworkForm">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle class="flex items-center">
            <ClipboardCheck class="h-5 w-5 mr-2 text-primary" />
            {{ editingHomework ? "Edit Homework" : "Create New Homework" }}
          </DialogTitle>
          <DialogDescription>
            Complete the form below to
            {{ editingHomework ? "update" : "create" }} a homework assignment
            for this group.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-6">
          <!-- Homework Title -->
          <div class="space-y-2">
            <Label for="title"
              >Homework Title<span class="text-destructive">*</span></Label
            >
            <Input
              id="title"
              type="text"
              v-model="homeworkForm.title"
              placeholder="Enter a descriptive title..."
            />
            <p class="text-sm text-muted-foreground flex items-center">
              <Info class="h-3.5 w-3.5 mr-1.5 text-primary" />
              A clear title helps students understand the task
            </p>
          </div>

          <!-- Description -->
          <div class="space-y-2">
            <Label for="description">Description</Label>
            <Textarea
              id="description"
              v-model="homeworkForm.description"
              placeholder="Enter homework instructions and details..."
              rows="4"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Start Date -->
            <div class="space-y-2">
              <Label for="start_date"
                >Start Date<span class="text-destructive">*</span></Label
              >
              <div class="relative">
                <Calendar
                  class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                />
                <Input
                  id="start_date"
                  type="date"
                  v-model="homeworkForm.start_date"
                  class="pl-9"
                />
              </div>
            </div>

            <!-- Deadline -->
            <div class="space-y-2">
              <Label for="deadline"
                >Deadline<span class="text-destructive">*</span></Label
              >
              <div class="relative">
                <Calendar
                  class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                />
                <Input
                  id="deadline"
                  type="date"
                  v-model="homeworkForm.deadline"
                  class="pl-9"
                />
              </div>
            </div>
          </div>

          <!-- Lesson Selection (Optional) -->
          <div class="space-y-2">
            <Label for="lesson_id">Related Lesson (Optional)</Label>
            <Select v-model="homeworkForm.lesson_id">
              <SelectTrigger>
                <SelectValue
                  placeholder="Select a lesson for this homework (optional)"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="null">No specific lesson</SelectItem>
                <SelectItem
                  v-for="lesson in lessons"
                  :key="lesson.id"
                  :value="lesson.id"
                >
                  {{ lesson.unitTitle }} - {{ lesson.title }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-sm text-muted-foreground flex items-center">
              <Info class="h-3.5 w-3.5 mr-1.5 text-primary" />
              Link this homework to a specific lesson (optional)
            </p>
          </div>

          <!-- Error message -->
          <div v-if="formError" class="text-destructive text-sm">
            {{ formError }}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="closeHomeworkForm"> Cancel </Button>
          <Button
            @click="submitHomework"
            :disabled="isSubmitting || !isFormValid"
            variant="default"
            class="ml-2"
          >
            <div v-if="isSubmitting" class="flex items-center">
              <Loader2 class="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </div>
            <div v-else class="flex items-center">
              <Save class="h-4 w-4 mr-2" />
              {{ editingHomework ? "Update" : "Create" }}
            </div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from "vue";
import {
  groupsAPI,
  courseAPI,
  groupHomeworksAPI,
  unitsAPI,
} from "@/utils/api.js";
import { useAuthStore } from "@/stores/auth.js";

// Import shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import Lucide icons
import {
  X,
  Check,
  Users,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Plus,
  Info,
  Calendar,
  Save,
  Loader2,
} from "lucide-vue-next";

const authStore = useAuthStore();

// State
const isLoading = ref(false);
const isSubmitting = ref(false);
const error = ref("");
const formError = ref("");
const successMessage = ref("");
const groups = ref([]);
const courses = ref([]);
const units = ref([]);
const lessons = ref([]);
const groupHomeworks = ref({});
const selectedGroup = ref(null);
const selectedGroupId = ref("");
const searchQuery = ref("");
const homeworkSearchQuery = ref("");
const showHomeworkForm = ref(false);
const editingHomework = ref(null);

// Form for homework configuration
const homeworkForm = ref({
  id: null,
  title: "",
  description: "",
  start_date: new Date().toISOString().split("T")[0], // Today
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0], // +7 days
  lesson_id: "",
  group_id: "",
  teacher_id: "",
});

// Computed property to check if the form is valid
const isFormValid = computed(() => {
  return (
    homeworkForm.value.title &&
    homeworkForm.value.start_date &&
    homeworkForm.value.deadline
  );
});

// Computed
const filteredGroups = computed(() => {
  if (!searchQuery.value) {
    return groups.value;
  }

  const query = searchQuery.value.toLowerCase();
  return groups.value.filter((group) =>
    group.name.toLowerCase().includes(query)
  );
});

const filteredHomeworks = computed(() => {
  if (!selectedGroup.value || !groupHomeworks.value[selectedGroup.value.id])
    return [];

  let result = groupHomeworks.value[selectedGroup.value.id];

  if (homeworkSearchQuery.value) {
    const query = homeworkSearchQuery.value.toLowerCase();
    result = result.filter(
      (homework) =>
        homework.title.toLowerCase().includes(query) ||
        (homework.description &&
          homework.description.toLowerCase().includes(query))
    );
  }

  // Sort by deadline (null deadlines at the end)
  return result.sort((a, b) => {
    // Handle cases where either deadline might be null
    if (!a.deadline && !b.deadline) return a.title.localeCompare(b.title); // Sort by title if both have no deadline
    if (!a.deadline) return 1; // Push items with no deadline to the end
    if (!b.deadline) return -1; // Keep items with deadline at the beginning

    // Compare dates for items that both have deadlines
    const dateA = new Date(a.deadline);
    const dateB = new Date(b.deadline);

    if (dateA.getTime() === dateB.getTime()) {
      // If deadlines are the same, sort by title
      return a.title.localeCompare(b.title);
    }

    // Sort by deadline (ascending - earlier dates first)
    return dateA - dateB;
  });
});

// Methods
const fetchGroups = async () => {
  isLoading.value = true;
  error.value = "";

  try {
    const response = await groupsAPI.getByTeacherId(authStore.userId);
    const groupsData = response.data || response;
    groups.value = Array.isArray(groupsData) ? groupsData : [];
  } catch (err) {
    error.value = `Failed to fetch groups: ${err.message || "Unknown error"}`;
    console.error("Error fetching groups:", err);
    groups.value = [];
  } finally {
    isLoading.value = false;
  }
};

const fetchCourses = async () => {
  try {
    const response = await courseAPI.getAll();
    const coursesData = response.data || response;
    courses.value = Array.isArray(coursesData) ? coursesData : [];
  } catch (err) {
    console.error("Error fetching courses:", err);
    courses.value = [];
  }
};

const fetchUnitsAndLessons = async (courseId) => {
  try {
    const response = await unitsAPI.getByCourseId(courseId);
    const unitsData = response.data || response;
    units.value = Array.isArray(unitsData) ? unitsData : [];

    // Extract all lessons from units
    lessons.value = [];
    units.value.forEach((unit) => {
      if (unit.lessons && Array.isArray(unit.lessons)) {
        unit.lessons.forEach((lesson) => {
          lessons.value.push({
            ...lesson,
            unitTitle: unit.title,
            unitId: unit.id,
          });
        });
      }
    });
  } catch (err) {
    console.error("Error fetching units and lessons:", err);
    units.value = [];
    lessons.value = [];
  }
};

const fetchGroupHomeworks = async (groupId) => {
  try {
    const response = await groupHomeworksAPI.getByGroupId(groupId);
    const homeworksData = response.data || response;

    // Update the groupHomeworks object with this group's homeworks
    groupHomeworks.value = {
      ...groupHomeworks.value,
      [groupId]: Array.isArray(homeworksData) ? homeworksData : [],
    };
  } catch (err) {
    console.error(`Error fetching homeworks for group ${groupId}:`, err);
    groupHomeworks.value[groupId] = [];
  }
};

const selectGroup = async (group) => {
  selectedGroup.value = group;
  selectedGroupId.value = group.id;
  resetForm();

  // Load homeworks for this group and lessons for the course
  await Promise.all([
    fetchGroupHomeworks(group.id),
    fetchUnitsAndLessons(group.level_id),
  ]);
};

const handleGroupSelection = async (groupId) => {
  if (groupId) {
    const group = groups.value.find((g) => g.id === groupId);
    if (group) {
      await selectGroup(group);
    }
  } else {
    selectedGroup.value = null;
    selectedGroupId.value = "";
    resetForm();
  }
};

const resetForm = () => {
  homeworkForm.value = {
    id: null,
    title: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0], // Today
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // +7 days
    lesson_id: "",
    group_id: "",
    teacher_id: "",
  };
  editingHomework.value = null;
  formError.value = "";
};

const openHomeworkForm = (homework = null) => {
  resetForm();

  if (homework) {
    // Edit mode
    editingHomework.value = homework;
    homeworkForm.value = {
      id: homework.id,
      title: homework.title,
      description: homework.description || "",
      start_date: homework.start_date || new Date().toISOString().split("T")[0],
      deadline:
        homework.deadline ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      lesson_id: homework.lesson_id || "",
      group_id: selectedGroup.value.id,
      teacher_id: authStore.userId,
    };
  } else {
    // Create mode
    homeworkForm.value.group_id = selectedGroup.value.id;
    homeworkForm.value.teacher_id = authStore.userId;
  }

  showHomeworkForm.value = true;
};

const closeHomeworkForm = () => {
  showHomeworkForm.value = false;
};

// Get appropriate status class based on homework dates
const getStatusClass = (homework) => {
  const now = new Date();
  const startDate = homework.start_date ? new Date(homework.start_date) : null;
  const deadline = homework.deadline ? new Date(homework.deadline) : null;

  if (deadline && deadline < now) {
    return "text-red-600 font-medium";
  } else if (startDate && startDate > now) {
    return "text-orange-600 font-medium";
  } else {
    return "text-green-600 font-medium";
  }
};

// Get human-readable status text based on homework dates
// Get the appropriate badge variant based on homework status
const getStatusVariant = (homework) => {
  const now = new Date();
  const startDate = homework.start_date ? new Date(homework.start_date) : null;
  const deadline = homework.deadline ? new Date(homework.deadline) : null;

  if (deadline && deadline < now) {
    return "destructive"; // Expired - red
  } else if (startDate && startDate > now) {
    return "warning"; // Scheduled - orange/yellow
  } else {
    return "success"; // Active - green
  }
};

const getStatusText = (homework) => {
  const now = new Date();
  const startDate = homework.start_date ? new Date(homework.start_date) : null;
  const deadline = homework.deadline ? new Date(homework.deadline) : null;

  if (deadline && deadline < now) {
    return "Expired";
  } else if (startDate && startDate > now) {
    return "Scheduled";
  } else {
    return "Active";
  }
};

const deleteHomework = async (homework) => {
  if (
    !confirm(
      `Are you sure you want to delete the homework "${homework.title}"?`
    )
  ) {
    return;
  }

  error.value = "";
  successMessage.value = "";

  try {
    await groupHomeworksAPI.delete(homework.id);

    // Remove from local state
    if (selectedGroup.value && groupHomeworks.value[selectedGroup.value.id]) {
      groupHomeworks.value[selectedGroup.value.id] = groupHomeworks.value[
        selectedGroup.value.id
      ].filter((hw) => hw.id !== homework.id);
    }

    successMessage.value = `"${homework.title}" has been deleted successfully`;
  } catch (err) {
    error.value = `Failed to delete homework: ${
      err.message || "Unknown error"
    }`;
    console.error("Error deleting homework:", err);
  }
};

const submitHomework = async () => {
  if (!selectedGroup.value || !homeworkForm.value.title) {
    error.value = "Please select a group and provide a homework title";
    return;
  }

  if (!homeworkForm.value.deadline) {
    error.value = "Please provide a deadline";
    return;
  }

  isSubmitting.value = true;
  error.value = "";
  successMessage.value = "";

  try {
    // Prepare homework data
    const homeworkData = {
      title: homeworkForm.value.title,
      description: homeworkForm.value.description,
      group_id: selectedGroup.value.id,
      teacher_id: authStore.userId,
      start_date: homeworkForm.value.start_date,
      deadline: homeworkForm.value.deadline,
      lesson_id: homeworkForm.value.lesson_id || null,
    };

    let response;

    if (editingHomework.value) {
      // Update existing homework
      response = await groupHomeworksAPI.update(
        editingHomework.value.id,
        homeworkData
      );
      successMessage.value = `Homework "${homeworkForm.value.title}" has been successfully updated`;
    } else {
      // Create new homework
      response = await groupHomeworksAPI.create(homeworkData);
      successMessage.value = `Homework "${homeworkForm.value.title}" has been successfully assigned to ${selectedGroup.value.name}`;
    }

    // Refresh homeworks for this group
    await fetchGroupHomeworks(selectedGroup.value.id);

    // Reset form and close modal
    closeHomeworkForm();
  } catch (err) {
    error.value = `Failed to save homework: ${err.message || "Unknown error"}`;
    console.error("Error saving homework:", err);
  } finally {
    isSubmitting.value = false;
  }
};

const getCourseTitle = (courseId) => {
  const course = courses.value.find((c) => c.id === courseId);
  return course ? course.title : "Unknown Course";
};

const getLessonTitle = (lessonId) => {
  if (!lessonId) return null;
  const lesson = lessons.value.find((l) => l.id === lessonId);
  return lesson ? `${lesson.unitTitle} - ${lesson.title}` : null;
};

// Lifecycle
onMounted(async () => {
  await Promise.all([fetchGroups(), fetchCourses()]);
});
</script>
