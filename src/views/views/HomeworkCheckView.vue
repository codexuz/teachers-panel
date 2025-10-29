<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="p-4 sm:p-6 border-b bg-background">
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div class="space-y-1">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
            Homework Check
          </h1>
          <p class="text-muted-foreground">
            Review and manage homework assignments for your groups
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 p-4 sm:p-6">
      <!-- Error Alert -->
      <div v-if="error" class="mb-6">
        <Alert variant="destructive">
          <AlertCircle class="h-4 w-4" />
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
      </div>

      <!-- Filters -->
      <Card class="mb-6">
        <CardHeader>
          <CardTitle class="flex items-center">
            <Users class="h-5 w-5 mr-2 text-primary" />
            Filters
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
                  <SelectValue placeholder="Choose a group to view homework" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="null">All Groups</SelectItem>
                  <SelectItem
                    v-for="group in filteredGroups"
                    :key="group.id"
                    :value="group.id"
                  >
                    {{ group.name }} - {{ getCourseTitle(group.level_id) }}
                    {{ group.is_active !== false ? "" : " (Inactive)" }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="isLoadingGroups" class="text-sm text-muted-foreground">
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

      <!-- Homework Table -->
      <Card v-if="selectedGroup">
        <CardHeader>
          <div
            class="flex flex-col sm:flex-row sm:justify-between sm:items-center"
          >
            <CardTitle class="flex items-center">
              <ClipboardCheck class="h-5 w-5 mr-2 text-primary" />
              Homework for {{ selectedGroup.name }}
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
                placeholder="Search homework..."
                class="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <!-- Loading State -->
          <div
            v-if="isLoadingHomeworks"
            class="flex flex-col items-center justify-center py-12"
          >
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"
            ></div>
            <p class="text-muted-foreground">Loading homework assignments...</p>
          </div>

          <!-- No Homework State -->
          <div
            v-else-if="filteredHomeworks.length === 0"
            class="text-center py-12 bg-muted/50 rounded-lg border"
          >
            <ClipboardCheck
              class="h-16 w-16 mx-auto text-muted-foreground/70 mb-4"
            />
            <p class="text-muted-foreground font-medium">
              No homework assignments found
            </p>
            <p class="text-muted-foreground/70 text-sm mt-1">
              {{
                homeworks.length === 0
                  ? "This group has no homework assigned"
                  : "Try adjusting your search criteria"
              }}
            </p>
          </div>

          <!-- Homework Table -->
          <div v-else class="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[50px]">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead class="hidden md:table-cell"
                    >Description</TableHead
                  >
                  <TableHead class="w-[120px]">Start Date</TableHead>
                  <TableHead class="w-[120px]">Deadline</TableHead>
                  <TableHead class="w-[100px]">Status</TableHead>
                  <TableHead class="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="(homework, index) in filteredHomeworks"
                  :key="homework.id"
                  class="hover:bg-muted/50"
                >
                  <TableCell class="font-medium">{{ index + 1 }}</TableCell>
                  <TableCell>
                    <div class="space-y-1">
                      <p class="font-medium">{{ homework.title }}</p>
                      <p
                        v-if="homework.lesson_id"
                        class="text-xs text-muted-foreground"
                      >
                        Lesson ID: {{ homework.lesson_id }}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell class="hidden md:table-cell">
                    <div class="max-w-xs">
                      <p
                        v-if="homework.description"
                        class="text-sm text-muted-foreground truncate"
                      >
                        {{ homework.description }}
                      </p>
                      <span v-else class="text-xs text-muted-foreground italic"
                        >No description</span
                      >
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="text-sm">
                      {{
                        homework.start_date
                          ? formatDate(homework.start_date)
                          : "Not set"
                      }}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="text-sm">
                      {{
                        homework.deadline
                          ? formatDate(homework.deadline)
                          : "No deadline"
                      }}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="getStatusVariant(homework)">
                      {{ getStatusText(homework) }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8"
                        @click="viewSubmissions(homework)"
                        title="View Submissions"
                      >
                        <Eye class="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Homework Count -->
          <div
            v-if="filteredHomeworks.length > 0"
            class="mt-4 text-sm text-muted-foreground"
          >
            Showing {{ filteredHomeworks.length }} of
            {{ homeworks.length }} homework assignments
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Homework Details Modal -->
    <Dialog v-model:open="showDetailsModal">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle class="flex items-center">
            <ClipboardCheck class="h-5 w-5 mr-2 text-primary" />
            Homework Details
          </DialogTitle>
        </DialogHeader>

        <div v-if="selectedHomework" class="space-y-4">
          <div>
            <Label class="text-sm font-medium text-muted-foreground"
              >Title</Label
            >
            <p class="text-lg font-medium">{{ selectedHomework.title }}</p>
          </div>

          <div v-if="selectedHomework.description">
            <Label class="text-sm font-medium text-muted-foreground"
              >Description</Label
            >
            <p class="text-sm">{{ selectedHomework.description }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Start Date</Label
              >
              <p class="text-sm">
                {{
                  selectedHomework.start_date
                    ? formatDate(selectedHomework.start_date)
                    : "Not set"
                }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Deadline</Label
              >
              <p class="text-sm">
                {{
                  selectedHomework.deadline
                    ? formatDate(selectedHomework.deadline)
                    : "No deadline"
                }}
              </p>
            </div>
          </div>

          <div v-if="selectedHomework.lesson_id">
            <Label class="text-sm font-medium text-muted-foreground"
              >Lesson ID</Label
            >
            <p class="text-sm">{{ selectedHomework.lesson_id }}</p>
          </div>

          <div>
            <Label class="text-sm font-medium text-muted-foreground"
              >Status</Label
            >
            <div class="mt-1">
              <Badge :variant="getStatusVariant(selectedHomework)">
                {{ getStatusText(selectedHomework) }}
              </Badge>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Created</Label
              >
              <p>
                {{
                  selectedHomework.created_at
                    ? formatDateTime(selectedHomework.created_at)
                    : "Unknown"
                }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Updated</Label
              >
              <p>
                {{
                  selectedHomework.updated_at
                    ? formatDateTime(selectedHomework.updated_at)
                    : "Unknown"
                }}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDetailsModal = false">
            Close
          </Button>
          <Button @click="editHomework(selectedHomework)">
            <Pencil class="h-4 w-4 mr-2" />
            Edit Homework
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.js";
import { groupsAPI, courseAPI, groupHomeworksAPI } from "@/utils/api.js";

// Shadcn Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Lucide Icons
import {
  Users,
  ClipboardCheck,
  Eye,
  Pencil,
  AlertCircle,
} from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();

// State
const isLoadingGroups = ref(false);
const isLoadingHomeworks = ref(false);
const error = ref("");
const groups = ref([]);
const courses = ref([]);
const homeworks = ref([]);
const selectedGroup = ref(null);
const selectedGroupId = ref("");
const selectedHomework = ref(null);
const searchQuery = ref("");
const homeworkSearchQuery = ref("");
const showDetailsModal = ref(false);

// Computed properties
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
  let result = homeworks.value;

  // Apply search filter
  if (homeworkSearchQuery.value) {
    const query = homeworkSearchQuery.value.toLowerCase();
    result = result.filter(
      (homework) =>
        homework.title.toLowerCase().includes(query) ||
        (homework.description &&
          homework.description.toLowerCase().includes(query))
    );
  }

  // Sort by start_date (earliest first, null dates at the end)
  return result.sort((a, b) => {
    const dateA = a.start_date ? new Date(a.start_date) : null;
    const dateB = b.start_date ? new Date(b.start_date) : null;

    // Handle null dates - put them at the end
    if (!dateA && !dateB) return a.title.localeCompare(b.title);
    if (!dateA) return 1;
    if (!dateB) return -1;

    // Sort by date (ascending - earliest first)
    const timeDiff = dateA.getTime() - dateB.getTime();
    if (timeDiff === 0) {
      // If dates are the same, sort by title
      return a.title.localeCompare(b.title);
    }

    return timeDiff;
  });
});

// Methods
const fetchGroups = async () => {
  if (!authStore.userId) {
    error.value = "User not authenticated";
    return;
  }

  isLoadingGroups.value = true;
  try {
    const response = await groupsAPI.getByTeacherId(authStore.userId);
    const groupsData = response.data || response;
    groups.value = Array.isArray(groupsData) ? groupsData : [];
    error.value = "";
  } catch (err) {
    error.value = `Failed to fetch groups: ${err.message || "Unknown error"}`;
    console.error("Error fetching groups:", err);
    groups.value = [];
  } finally {
    isLoadingGroups.value = false;
  }
};

const fetchCourses = async () => {
  try {
    const response = await courseAPI.getAll();
    courses.value = response.data || response;
  } catch (err) {
    console.error("Error fetching courses:", err);
  }
};

const fetchHomeworks = async (groupId) => {
  isLoadingHomeworks.value = true;
  try {
    const response = await groupHomeworksAPI.getByGroupId(groupId);
    const homeworksData = response.data || response;
    homeworks.value = Array.isArray(homeworksData) ? homeworksData : [];
    error.value = "";
  } catch (err) {
    error.value = `Failed to fetch homework assignments: ${
      err.message || "Unknown error"
    }`;
    console.error("Error fetching homeworks:", err);
    homeworks.value = [];
  } finally {
    isLoadingHomeworks.value = false;
  }
};

const selectGroup = async (group) => {
  selectedGroup.value = group;
  selectedGroupId.value = group.id;
  await fetchHomeworks(group.id);
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
    homeworks.value = [];
  }
};

const getCourseTitle = (levelId) => {
  const course = courses.value.find((c) => c.id === levelId);
  return course ? course.title || course.name : "Unknown Course";
};

const getStudentCount = (group) => {
  return group.students?.length || group.student_count || 0;
};

const getStatusVariant = (homework) => {
  const now = new Date();
  const startDate = homework.start_date ? new Date(homework.start_date) : null;
  const deadline = homework.deadline ? new Date(homework.deadline) : null;

  if (deadline && deadline < now) {
    return "destructive"; // Expired - red
  } else if (startDate && startDate > now) {
    return "secondary"; // Scheduled - gray
  } else {
    return "default"; // Active - default
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

const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString();
};

const formatDateTime = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString();
};

const viewHomeworkDetails = (homework) => {
  selectedHomework.value = homework;
  showDetailsModal.value = true;
};

const viewSubmissions = (homework) => {
  // Navigate to homework submissions page
  router.push({
    name: "HomeworkCheckDetails",
    params: { homeworkId: homework.id },
    query: {
      groupName: selectedGroup.value.name,
      homeworkTitle: homework.title,
    },
  });
};

const editHomework = (homework) => {
  // Close details modal if open
  showDetailsModal.value = false;

  // Navigate to homework management page with the selected group
  router.push({
    name: "GroupHomework",
    query: { groupId: selectedGroup.value.id, editId: homework.id },
  });
};

// Lifecycle
onMounted(() => {
  fetchCourses();
  fetchGroups();
});
</script>
