<script setup>
import { ref, onMounted, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { trialLessonsAPI, groupStudentsAPI, teacherAPI } from "@/utils/api";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Book,
  ClipboardCheck,
  FileText,
  RefreshCw,
  User,
  Phone,
  Mail,
} from "lucide-vue-next";

const authStore = useAuthStore();
const trialLessons = ref([]);
const teacherBalance = ref(0);
const activeStudentsCount = ref(0);
const isLoading = ref(false);
const error = ref("");

// Fetch trial lessons data
const fetchTrialLessons = async () => {
  if (!authStore.user?.user?.id) {
    console.error("No teacher ID available");
    return;
  }

  isLoading.value = true;
  error.value = "";

  try {
    const data = await trialLessonsAPI.getByTeacherId(authStore.user?.user?.id);
    trialLessons.value = Array.isArray(data) ? data : [];
  } catch (err) {
    error.value = `Failed to fetch trial lessons: ${err.message}`;
    console.error("Error fetching trial lessons:", err);
    trialLessons.value = [];
  } finally {
    isLoading.value = false;
  }
};

// Fetch teacher balance
const fetchTeacherBalance = async () => {
  if (!authStore.user?.user?.id) {
    console.error("No teacher ID available");
    return;
  }

  try {
    const response = await teacherAPI.getBalance(authStore.user?.user?.id);
    // Handle response format: { amount: 0, ... }
    teacherBalance.value = response?.amount || 0;
  } catch (err) {
    console.error("Error fetching teacher balance:", err);
    teacherBalance.value = 0;
  }
};

// Fetch active students count
const fetchActiveStudentsCount = async () => {
  if (!authStore.user?.user?.id) {
    console.error("No teacher ID available");
    return;
  }

  try {
    const response = await groupStudentsAPI.getTeacherStudentCount(
      authStore.user?.user?.id
    );
    // Handle response format: { count: 18 }
    activeStudentsCount.value = response?.count || 0;
  } catch (err) {
    console.error("Error fetching active students count:", err);
    activeStudentsCount.value = 0;
  }
}; // Format date for display
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Format time for display
const formatTime = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Get status display text
const getStatusText = (status) => {
  switch (status?.toLowerCase()) {
    case "belgilangan":
      return "Scheduled";
    case "keldi":
      return "Completed";
    case "kelmadi":
      return "Cancelled";
    default:
      return status || "Unknown";
  }
};

// Get badge variant for status
const getStatusVariant = (status) => {
  switch (status?.toLowerCase()) {
    case "belgilangan":
      return "secondary";
    case "keldi":
      return "default";
    case "kelmadi":
      return "destructive";
    default:
      return "secondary";
  }
};

// Computed stats
const totalTrialLessons = computed(() => trialLessons.value.length);
const completedLessons = computed(
  () =>
    trialLessons.value.filter(
      (lesson) => lesson.status?.toLowerCase() === "keldi"
    ).length
);

// Lifecycle
onMounted(() => {
  fetchTrialLessons();
  fetchTeacherBalance();
  fetchActiveStudentsCount();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="space-y-2">
      <h2 class="text-3xl font-bold tracking-tight">Dashboard</h2>
      <p class="text-muted-foreground">
        Welcome back! Here's what's happening in your classes.
      </p>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Total Trial Lessons</CardTitle>
          <Users class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ totalTrialLessons }}</div>
          <p class="text-xs text-muted-foreground">All trial lessons</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Teacher's Wallet</CardTitle>
          <FileText class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ teacherBalance.toLocaleString() }} UZS
          </div>
          <p class="text-xs text-muted-foreground">Current balance</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">All Active Students</CardTitle>
          <CheckCircle class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ activeStudentsCount }}</div>
          <p class="text-xs text-muted-foreground">Active students</p>
        </CardContent>
      </Card>
    </div>

    <!-- Students Assigned to Trial Lessons -->
    <Card>
      <CardHeader>
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0"
        >
          <div>
            <CardTitle>Trial Lessons Assigned to You</CardTitle>
            <CardDescription
              >Manage your scheduled trial lessons</CardDescription
            >
          </div>
          <div class="flex gap-2">
            <Button
              @click="fetchTrialLessons"
              :disabled="isLoading"
              variant="outline"
              size="sm"
            >
              <RefreshCw
                :class="['h-4 w-4 mr-2', { 'animate-spin': isLoading }]"
              />
              {{ isLoading ? "Loading..." : "Refresh" }}
            </Button>
            <Button size="sm">
              <Eye class="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>
        </div>
        <div v-if="error" class="mt-3">
          <div
            class="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3"
          >
            {{ error }}
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <!-- Loading State -->
        <div v-if="isLoading" class="p-8 text-center">
          <RefreshCw
            class="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground"
          />
          <div class="text-muted-foreground">Loading trial lessons...</div>
        </div>

        <!-- Empty State -->
        <div v-else-if="trialLessons.length === 0" class="p-8 text-center">
          <Calendar class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <div class="text-lg font-medium">No trial lessons found</div>
          <div class="text-sm text-muted-foreground">
            You don't have any trial lessons assigned yet.
          </div>
        </div>

        <!-- Data Table -->
        <div v-else class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead class="hidden sm:table-cell">Contact Info</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead class="hidden md:table-cell">Lead Status</TableHead>
                <TableHead>Lesson Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="lesson in trialLessons" :key="lesson.id">
                <TableCell>
                  <div class="flex items-center gap-3">
                    <Avatar class="h-8 w-8">
                      <AvatarFallback>
                        {{
                          (lesson.leadInfo?.first_name || "U")
                            .charAt(0)
                            .toUpperCase()
                        }}
                      </AvatarFallback>
                    </Avatar>
                    <div class="space-y-1">
                      <div class="font-medium">
                        {{ lesson.leadInfo?.first_name }}
                        {{ lesson.leadInfo?.last_name }}
                      </div>
                      <div class="text-xs text-muted-foreground">
                        ID: {{ lesson.leadInfo?.id }}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell class="hidden sm:table-cell">
                  <div class="space-y-1">
                    <div class="flex items-center gap-1">
                      <Phone class="h-3 w-3" />
                      <span class="text-sm">{{
                        lesson.leadInfo?.phone || "No phone"
                      }}</span>
                    </div>
                    <Badge variant="secondary" class="text-xs">
                      {{ lesson.leadInfo?.status || "Unknown" }}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="space-y-1">
                    <div class="text-sm">
                      {{ formatDate(lesson.scheduledAt) }}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{ formatTime(lesson.scheduledAt) }}
                    </div>
                  </div>
                </TableCell>
                <TableCell class="hidden md:table-cell">
                  <Badge variant="outline">
                    {{ lesson.leadInfo?.status || "Unknown" }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    :variant="
                      lesson.status?.toLowerCase() === 'keldi'
                        ? 'default'
                        : lesson.status?.toLowerCase() === 'belgilangan'
                        ? 'secondary'
                        : 'outline'
                    "
                  >
                    {{ getStatusText(lesson.status) }}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter>
        <div
          class="flex flex-col sm:flex-row items-center justify-between w-full gap-4"
        >
          <div class="text-sm text-muted-foreground">
            Showing {{ trialLessons.length }} trial lesson{{
              trialLessons.length !== 1 ? "s" : ""
            }}
          </div>
          <div class="flex flex-wrap gap-2">
            <Badge variant="default">{{ completedLessons }} Completed</Badge>
          </div>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>
