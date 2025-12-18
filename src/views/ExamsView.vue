<template>
  <div id="exams" class="content-page">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold">Exams</h2>
        <Button @click="openCreateDialog">
          <i class="fas fa-plus mr-2"></i>Create Exam
        </Button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardContent class="pt-6 text-center">
          <div
            class="p-4 bg-blue-100 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center"
          >
            <FileText class="h-8 w-8 text-blue-600" />
          </div>
          <h3 class="text-2xl font-bold">{{ exams.length }}</h3>
          <p class="text-muted-foreground">Total Exams</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6 text-center">
          <div
            class="p-4 bg-green-100 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center"
          >
            <Clock class="h-8 w-8 text-green-600" />
          </div>
          <h3 class="text-2xl font-bold">{{ scheduledCount }}</h3>
          <p class="text-muted-foreground">Scheduled</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6 text-center">
          <div
            class="p-4 bg-purple-100 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center"
          >
            <CheckCircle class="h-8 w-8 text-purple-600" />
          </div>
          <h3 class="text-2xl font-bold">{{ completedCount }}</h3>
          <p class="text-muted-foreground">Completed</p>
        </CardContent>
      </Card>
    </div>

    <!-- Filters and Search -->
    <Card>
      <CardHeader>
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <Input
              v-model="searchQuery"
              type="text"
              placeholder="Search exams by title..."
            />
          </div>
          <Select v-model="filterStatus">
            <SelectTrigger class="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="filterLevel">
            <SelectTrigger class="w-[180px]">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="elementary">Elementary</SelectItem>
              <SelectItem value="pre-intermediate">Pre-Intermediate</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <!-- Exams Table -->
      <CardContent>
        <div v-if="loading" class="p-12 text-center">
          <i class="fas fa-spinner fa-spin text-4xl text-primary"></i>
          <p class="mt-4 text-muted-foreground">Loading exams...</p>
        </div>

        <div v-else-if="filteredExams.length === 0" class="p-12 text-center">
          <i class="fas fa-inbox text-6xl text-muted mb-4"></i>
          <p class="text-muted-foreground">No exams found</p>
        </div>

        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="exam in filteredExams" :key="exam.id">
              <TableCell class="font-medium">{{ exam.title }}</TableCell>
              <TableCell>{{ getGroupName(exam.group_id) }}</TableCell>
              <TableCell>
                <Badge :variant="getLevelVariant(exam.level)">
                  {{ formatLevel(exam.level) }}
                </Badge>
              </TableCell>
              <TableCell>{{ formatDate(exam.scheduled_at) }}</TableCell>
              <TableCell>
                <Badge v-if="exam.is_online" variant="default">
                  <i class="fas fa-wifi mr-1"></i>Online
                </Badge>
                <Badge v-else variant="secondary">
                  <i class="fas fa-building mr-1"></i>Offline
                </Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="getStatusVariant(exam.status)">
                  {{ formatStatus(exam.status) }}
                </Badge>
              </TableCell>
              <TableCell>
                <div class="flex gap-2">
                  <Button
                    @click="router.push(`/exam-results?examId=${exam.id}`)"
                    variant="ghost"
                    size="sm"
                    title="View Results"
                  >
                    <ArrowRight class="h-4 w-4" />
                  </Button>
                  <Button @click="editExam(exam)" variant="ghost" size="sm">
                    <Edit class="h-4 w-4" />
                  </Button>
                  <Button
                    @click="deleteExam(exam.id)"
                    variant="ghost"
                    size="sm"
                  >
                    <Trash class="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Create/Edit Dialog -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {{ isEditing ? "Edit Exam" : "Create New Exam" }}
          </DialogTitle>
        </DialogHeader>

        <form @submit.prevent="submitForm" class="space-y-4">
          <div class="space-y-2">
            <Label for="title">Title</Label>
            <Input
              id="title"
              v-model="formData.title"
              type="text"
              required
              placeholder="Enter exam title"
            />
          </div>

          <div class="space-y-2">
            <Label for="group">Group</Label>
            <Select v-model="formData.group_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="group in groups"
                  :key="group.id"
                  :value="group.id"
                >
                  {{ group.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="level">Level</Label>
            <Select v-model="formData.level" required>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="elementary">Elementary</SelectItem>
                <SelectItem value="pre-intermediate"
                  >Pre-Intermediate</SelectItem
                >
                <SelectItem value="intermediate">Intermediate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="scheduled">Scheduled Date & Time</Label>
            <Input
              id="scheduled"
              v-model="formData.scheduled_at"
              type="datetime-local"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="status">Status</Label>
            <Select v-model="formData.status">
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex items-center space-x-2">
            <Checkbox id="isOnline" v-model:checked="formData.is_online" />
            <Label for="isOnline" class="cursor-pointer"> Online Exam </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeDialog">
              Cancel
            </Button>
            <Button type="submit" :disabled="submitting">
              {{ submitting ? "Saving..." : isEditing ? "Update" : "Create" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { examsAPI, groupsAPI } from "../utils/api";
import { useAuthStore } from "@/stores/auth.js";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  Clock,
  CheckCircle,
  ArrowRight,
  Trash,
  Edit,
} from "lucide-vue-next";

const authStore = useAuthStore();
const router = useRouter();

// State
const exams = ref([]);
const groups = ref([]);
const loading = ref(false);
const submitting = ref(false);
const showDialog = ref(false);
const isEditing = ref(false);
const searchQuery = ref("");
const filterStatus = ref("all");
const filterLevel = ref("all");

// Form data
const formData = ref({
  id: null,
  title: "",
  group_id: "",
  level: "beginner",
  scheduled_at: "",
  status: "scheduled",
  is_online: false,
});

// Computed properties
const scheduledCount = computed(() => {
  return exams.value.filter((exam) => exam.status === "scheduled").length;
});

const completedCount = computed(() => {
  return exams.value.filter((exam) => exam.status === "completed").length;
});

const filteredExams = computed(() => {
  return exams.value.filter((exam) => {
    const matchesSearch = exam.title
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase());
    const matchesStatus =
      filterStatus.value === "all" || exam.status === filterStatus.value;
    const matchesLevel =
      filterLevel.value === "all" || exam.level === filterLevel.value;
    return matchesSearch && matchesStatus && matchesLevel;
  });
});

// Methods
const fetchExams = async () => {
  loading.value = true;
  try {
    const teacherId = authStore.userId;
    const response = await examsAPI.getByTeacherId(teacherId);
    exams.value = Array.isArray(response) ? response : response.data || [];
  } catch (error) {
    console.error("Error fetching exams:", error);
    alert("Failed to load exams. Please try again.");
  } finally {
    loading.value = false;
  }
};

const fetchGroups = async () => {
  try {
    const teacherId = authStore.userId;
    const response = await groupsAPI.getByTeacherId(teacherId);
    groups.value = Array.isArray(response) ? response : response.data || [];
  } catch (error) {
    console.error("Error fetching groups:", error);
  }
};

const openCreateDialog = () => {
  isEditing.value = false;
  resetForm();
  showDialog.value = true;
};

const editExam = (exam) => {
  isEditing.value = true;
  formData.value = {
    id: exam.id,
    title: exam.title,
    group_id: exam.group_id,
    level: exam.level,
    scheduled_at: formatDateForInput(exam.scheduled_at),
    status: exam.status,
    is_online: exam.is_online,
  };
  showDialog.value = true;
};

const closeDialog = () => {
  showDialog.value = false;
  resetForm();
};

const resetForm = () => {
  formData.value = {
    id: null,
    title: "",
    group_id: "",
    level: "beginner",
    scheduled_at: "",
    status: "scheduled",
    is_online: false,
  };
};

const submitForm = async () => {
  submitting.value = true;
  try {
    if (isEditing.value) {
      await examsAPI.update(formData.value.id, formData.value);
    } else {
      await examsAPI.create(formData.value);
    }
    closeDialog();
    fetchExams();
  } catch (error) {
    console.error("Error saving exam:", error);
    alert("Failed to save exam. Please try again.");
  } finally {
    submitting.value = false;
  }
};

const deleteExam = async (id) => {
  if (!confirm("Are you sure you want to delete this exam?")) return;

  try {
    await examsAPI.delete(id);
    fetchExams();
  } catch (error) {
    console.error("Error deleting exam:", error);
    alert("Failed to delete exam. Please try again.");
  }
};

const viewExam = (exam) => {
  // Navigate to exam detail or show details
  alert(`Viewing exam: ${exam.title}`);
  // TODO: Implement exam detail view
};

// Utility methods
const getGroupName = (groupId) => {
  const group = groups.value.find((g) => g.id === groupId);
  return group ? group.name : "Unknown Group";
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateForInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatLevel = (level) => {
  return level
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatStatus = (status) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getLevelClass = (level) => {
  const classes = {
    beginner: "bg-green-100 text-green-800",
    elementary: "bg-blue-100 text-blue-800",
    "pre-intermediate": "bg-yellow-100 text-yellow-800",
    intermediate: "bg-orange-100 text-orange-800",
  };
  return classes[level] || "bg-gray-100 text-gray-800";
};

const getStatusClass = (status) => {
  const classes = {
    scheduled: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return classes[status] || "bg-gray-100 text-gray-800";
};

const getLevelVariant = (level) => {
  const variants = {
    beginner: "default",
    elementary: "secondary",
    "pre-intermediate": "outline",
    intermediate: "default",
  };
  return variants[level] || "secondary";
};

const getStatusVariant = (status) => {
  const variants = {
    scheduled: "default",
    completed: "secondary",
    cancelled: "destructive",
  };
  return variants[status] || "secondary";
};

// Lifecycle
onMounted(() => {
  fetchExams();
  fetchGroups();
});
</script>

<style scoped>
.content-page {
  padding: 2rem;
}

.card-shadow {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

@media (max-width: 640px) {
  .content-page {
    padding: 1rem;
  }
}
</style>
