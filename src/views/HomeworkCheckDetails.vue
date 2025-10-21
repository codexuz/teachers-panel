<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="p-4 sm:p-6 border-b bg-background">
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              @click="$router.back()"
              class="mr-2"
            >
              <ArrowLeft class="h-4 w-4" />
            </Button>
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
                Homework Submissions
              </h1>
              <p class="text-muted-foreground" v-if="homework">
                {{ homework.title }} - {{ groupName }}
              </p>
            </div>
          </div>
        </div>

        <!-- Summary Stats -->
        <div v-if="homework" class="flex gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-primary">
              {{ submissions.length }}
            </div>
            <div class="text-sm text-muted-foreground">Total Submissions</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">
              {{ gradedCount }}
            </div>
            <div class="text-sm text-muted-foreground">Graded</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">
              {{ pendingCount }}
            </div>
            <div class="text-sm text-muted-foreground">Pending</div>
          </div>
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

      <!-- Homework Info Card -->
      <Card v-if="homework" class="mb-6">
        <CardHeader>
          <CardTitle class="flex items-center">
            <ClipboardCheck class="h-5 w-5 mr-2 text-primary" />
            Homework Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Title</Label
              >
              <p class="font-medium">{{ homework.title }}</p>
            </div>
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Start Date</Label
              >
              <p>
                {{
                  homework.start_date
                    ? formatDate(homework.start_date)
                    : "Not set"
                }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Deadline</Label
              >
              <p>
                {{
                  homework.deadline
                    ? formatDate(homework.deadline)
                    : "No deadline"
                }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Status</Label
              >
              <Badge :variant="getHomeworkStatusVariant(homework)">
                {{ getHomeworkStatusText(homework) }}
              </Badge>
            </div>
          </div>
          <div v-if="homework.description" class="mt-4">
            <Label class="text-sm font-medium text-muted-foreground"
              >Description</Label
            >
            <p class="text-sm mt-1">{{ homework.description }}</p>
          </div>
        </CardContent>
      </Card>

      <!-- Filters -->
      <Card class="mb-6">
        <CardHeader>
          <CardTitle class="flex items-center">
            <Filter class="h-5 w-5 mr-2 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Search Students -->
            <div class="space-y-2">
              <Label>Search Students</Label>
              <Input
                v-model="searchQuery"
                placeholder="Search by student name..."
              />
            </div>

            <!-- Filter by Status -->
            <div class="space-y-2">
              <Label>Filter by Status</Label>
              <Select v-model="statusFilter">
                <SelectTrigger>
                  <SelectValue placeholder="All submissions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="null">All Submissions</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                  <SelectItem value="late">Late Submissions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Sort by -->
            <div class="space-y-2">
              <Label>Sort by</Label>
              <Select v-model="sortBy">
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Student Name</SelectItem>
                  <SelectItem value="submitted_at">Submission Date</SelectItem>
                  <SelectItem value="grade">Grade</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Submissions Table -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <div class="flex items-center">
              <Users class="h-5 w-5 mr-2 text-primary" />
              Student Submissions
            </div>
            <Badge variant="outline">
              {{ filteredSubmissions.length }} of
              {{ submissions.length }} submissions
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <!-- Loading State -->
          <div
            v-if="isLoading"
            class="flex flex-col items-center justify-center py-12"
          >
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"
            ></div>
            <p class="text-muted-foreground">Loading submissions...</p>
          </div>

          <!-- No Submissions State -->
          <div
            v-else-if="filteredSubmissions.length === 0"
            class="text-center py-12 bg-muted/50 rounded-lg border"
          >
            <ClipboardCheck
              class="h-16 w-16 mx-auto text-muted-foreground/70 mb-4"
            />
            <p class="text-muted-foreground font-medium">
              No submissions found
            </p>
            <p class="text-muted-foreground/70 text-sm mt-1">
              {{
                submissions.length === 0
                  ? "No students have submitted this homework yet"
                  : "Try adjusting your search criteria"
              }}
            </p>
          </div>

          <!-- Submissions Table -->
          <div v-else class="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[50px]">#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Submission Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead class="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="(submission, index) in filteredSubmissions"
                  :key="submission.id"
                  class="hover:bg-muted/50"
                >
                  <TableCell class="font-medium">{{ index + 1 }}</TableCell>
                  <TableCell>
                    <div class="space-y-1">
                      <p class="font-medium">
                        {{ submission.student_name || "Unknown Student" }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {{ submission.sections_count || 0 }} section{{
                          (submission.sections_count || 0) !== 1 ? "s" : ""
                        }}
                        completed
                      </p>
                      <p
                        v-if="hasUngraduatedWritingSections(submission)"
                        class="text-xs text-orange-600 font-medium"
                      >
                        ⚠️ Writing needs review
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="space-y-1">
                      <p class="text-sm">
                        {{
                          submission.submitted_at
                            ? formatDateTime(submission.submitted_at)
                            : "Not submitted"
                        }}
                      </p>
                      <p
                        v-if="isLateSubmission(submission)"
                        class="text-xs text-red-600"
                      >
                        Late submission
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="getSubmissionStatusVariant(submission)">
                      {{ getSubmissionStatusText(submission) }}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div
                      v-if="
                        submission.grade !== null &&
                        submission.grade !== undefined &&
                        submission.grade > 0
                      "
                    >
                      <Badge
                        :variant="getGradeVariant(submission.grade)"
                        class="font-mono"
                      >
                        {{ submission.grade }}%
                      </Badge>
                      <p class="text-xs text-muted-foreground mt-1">
                        Avg of {{ submission.sections_count }} sections
                      </p>
                    </div>
                    <span v-else class="text-muted-foreground text-sm"
                      >Not completed</span
                    >
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8"
                        @click="viewSubmissionDetails(submission)"
                        title="View Details"
                      >
                        <Eye class="h-4 w-4" />
                      </Button>
                      <Button
                        v-if="
                          submission.submitted_at &&
                          hasUngraduatedWritingSections(submission)
                        "
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8"
                        @click="viewSubmissionDetails(submission)"
                        title="Grade Writing"
                      >
                        <GraduationCap class="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Submission Count -->
          <div
            v-if="filteredSubmissions.length > 0"
            class="mt-4 text-sm text-muted-foreground"
          >
            Showing {{ filteredSubmissions.length }} of
            {{ submissions.length }} submissions
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Submission Details Modal -->
    <Dialog v-model:open="showDetailsModal">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle class="flex items-center">
            <ClipboardCheck class="h-5 w-5 mr-2 text-primary" />
            Submission Details
          </DialogTitle>
        </DialogHeader>

        <div v-if="selectedSubmission" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Student</Label
              >
              <p class="font-medium">
                {{ selectedSubmission.student_name || "Unknown Student" }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Submission Date</Label
              >
              <p>
                {{
                  selectedSubmission.submitted_at
                    ? formatDateTime(selectedSubmission.submitted_at)
                    : "Not submitted"
                }}
              </p>
            </div>
          </div>

          <!-- Sections Information -->
          <div
            v-if="
              selectedSubmission.sections &&
              selectedSubmission.sections.length > 0
            "
          >
            <Label class="text-sm font-medium text-muted-foreground">
              Completed Sections ({{ selectedSubmission.sections.length }})
            </Label>
            <div class="mt-2 space-y-3">
              <div
                v-for="section in selectedSubmission.sections"
                :key="section.id"
                class="border rounded-md p-3"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-3">
                    <Badge variant="outline" class="capitalize">
                      {{ section.section }}
                    </Badge>
                    <span class="text-sm text-muted-foreground">
                      {{ formatDateTime(section.createdAt) }}
                    </span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Badge
                      :variant="getGradeVariant(section.score)"
                      class="font-mono"
                    >
                      {{ section.score }}%
                    </Badge>
                    <Button
                      v-if="section.section === 'writing'"
                      variant="outline"
                      size="sm"
                      @click="gradeSectionSubmission(section)"
                      class="h-6 px-2 text-xs"
                    >
                      <GraduationCap class="h-3 w-3 mr-1" />
                      Grade
                    </Button>
                  </div>
                </div>

                <!-- Writing Content Display -->
                <div
                  v-if="
                    section.section === 'writing' &&
                    section.answers &&
                    section.answers.writing
                  "
                  class="mt-3"
                >
                  <Label class="text-xs font-medium text-muted-foreground">
                    Student Writing
                  </Label>
                  <div
                    class="mt-1 p-3 bg-muted/50 rounded border-l-4 border-blue-200"
                  >
                    <p class="text-sm whitespace-pre-wrap leading-relaxed">
                      {{ section.answers.writing }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedSubmission.content">
            <Label class="text-sm font-medium text-muted-foreground"
              >Submission Content</Label
            >
            <div class="mt-2 p-3 bg-muted rounded-md">
              <p class="text-sm whitespace-pre-wrap">
                {{ selectedSubmission.content }}
              </p>
            </div>
          </div>

          <div
            v-if="
              selectedSubmission.attachments &&
              selectedSubmission.attachments.length > 0
            "
          >
            <Label class="text-sm font-medium text-muted-foreground"
              >Attachments</Label
            >
            <div class="mt-2 space-y-2">
              <div
                v-for="attachment in selectedSubmission.attachments"
                :key="attachment.id"
                class="flex items-center justify-between p-2 border rounded"
              >
                <div class="flex items-center">
                  <FileText class="h-4 w-4 mr-2 text-muted-foreground" />
                  <span class="text-sm">{{ attachment.filename }}</span>
                </div>
                <Button variant="ghost" size="sm">
                  <Download class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Overall Score</Label
              >
              <p>
                {{
                  selectedSubmission.grade !== null &&
                  selectedSubmission.grade > 0
                    ? `${selectedSubmission.grade}%`
                    : "Not completed"
                }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Status</Label
              >
              <Badge :variant="getSubmissionStatusVariant(selectedSubmission)">
                {{ getSubmissionStatusText(selectedSubmission) }}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDetailsModal = false">
            Close
          </Button>
          <Button
            v-if="
              selectedSubmission?.submitted_at &&
              hasUngraduatedWritingSections(selectedSubmission)
            "
            @click="gradeSubmission(selectedSubmission)"
          >
            <GraduationCap class="h-4 w-4 mr-2" />
            Grade Writing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Section Grade Modal -->
    <Dialog v-model:open="showSectionGradeModal">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle class="flex items-center">
            <GraduationCap class="h-5 w-5 mr-2 text-primary" />
            Grade {{ selectedSection?.section || "Section" }} Section
          </DialogTitle>
        </DialogHeader>

        <div v-if="selectedSection" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Student</Label
              >
              <p class="font-medium">
                {{ selectedSubmission?.student_name || "Unknown Student" }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium text-muted-foreground"
                >Section Type</Label
              >
              <Badge variant="outline" class="capitalize">
                {{ selectedSection.section }}
              </Badge>
            </div>
          </div>

          <!-- Writing Content Display for Grading -->
          <div
            v-if="
              selectedSection.section === 'writing' &&
              selectedSection.answers &&
              selectedSection.answers.writing
            "
          >
            <Label class="text-sm font-medium text-muted-foreground">
              Student Writing Submission
            </Label>
            <div
              class="mt-2 p-4 bg-muted/50 rounded-lg border-l-4 border-blue-200 max-h-64 overflow-y-auto"
            >
              <p class="text-sm whitespace-pre-wrap leading-relaxed">
                {{ selectedSection.answers.writing }}
              </p>
            </div>
          </div>

          <!-- Score Input -->
          <div class="space-y-2">
            <Label for="sectionScore">
              Score (0-100)<span class="text-destructive">*</span>
            </Label>
            <Input
              id="sectionScore"
              type="number"
              v-model="sectionGradeForm.score"
              placeholder="Enter score..."
              min="0"
              max="100"
              step="1"
            />
          </div>

          <!-- Current Score Display -->
          <div class="p-3 bg-muted rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Current Score:</span>
              <Badge
                :variant="getGradeVariant(selectedSection.score)"
                class="font-mono"
              >
                {{ selectedSection.score }}%
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="closeSectionGradeModal">
            Cancel
          </Button>
          <Button @click="submitSectionGrade" :disabled="isSubmitting">
            <div v-if="isSubmitting" class="flex items-center">
              <Loader2 class="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </div>
            <div v-else class="flex items-center">
              <Save class="h-4 w-4 mr-2" />
              Save Grade
            </div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { homeworkSubmissionsAPI, groupHomeworksAPI } from "@/utils/api.js";

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
import { Textarea } from "@/components/ui/textarea";

// Lucide Icons
import {
  ArrowLeft,
  Users,
  ClipboardCheck,
  Eye,
  GraduationCap,
  AlertCircle,
  Filter,
  FileText,
  Download,
  Save,
  Loader2,
} from "lucide-vue-next";

const route = useRoute();
const router = useRouter();

// State
const isLoading = ref(false);
const isSubmitting = ref(false);
const error = ref("");
const submissions = ref([]);
const homework = ref(null);
const groupName = ref("");
const selectedSubmission = ref(null);
const searchQuery = ref("");
const statusFilter = ref("");
const sortBy = ref("name");
const showDetailsModal = ref(false);
const showGradeModal = ref(false);
const showSectionGradeModal = ref(false);
const selectedSection = ref(null);

// Section grade form
const sectionGradeForm = ref({
  score: "",
});

// Computed properties
const gradedCount = computed(() => {
  return submissions.value.filter(
    (s) =>
      s.grade !== null &&
      s.grade !== undefined &&
      s.grade > 0 &&
      !hasUngraduatedWritingSections(s)
  ).length;
});

const pendingCount = computed(() => {
  return submissions.value.filter(
    (s) =>
      s.submitted_at &&
      (s.grade === null ||
        s.grade === undefined ||
        s.grade === 0 ||
        hasUngraduatedWritingSections(s))
  ).length;
});

const filteredSubmissions = computed(() => {
  let result = submissions.value;

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (submission) =>
        (submission.student_name &&
          submission.student_name.toLowerCase().includes(query)) ||
        (submission.student_id &&
          submission.student_id.toString().includes(query))
    );
  }

  // Apply status filter
  if (statusFilter.value) {
    switch (statusFilter.value) {
      case "submitted":
        result = result.filter((s) => s.submitted_at);
        break;
      case "graded":
        result = result.filter(
          (s) =>
            s.sections &&
            s.sections.length > 0 &&
            !hasUngraduatedWritingSections(s)
        );
        break;
      case "needs_review":
        result = result.filter((s) => hasUngraduatedWritingSections(s));
        break;
      case "late":
        result = result.filter((s) => isLateSubmission(s));
        break;
    }
  }

  // Apply sorting
  return result.sort((a, b) => {
    switch (sortBy.value) {
      case "name":
        return (a.student_name || "").localeCompare(b.student_name || "");
      case "submitted_at":
        const dateA = a.submitted_at ? new Date(a.submitted_at) : null;
        const dateB = b.submitted_at ? new Date(b.submitted_at) : null;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime(); // Latest first
      case "grade":
        const gradeA = a.grade !== null ? a.grade : -1;
        const gradeB = b.grade !== null ? b.grade : -1;
        return gradeB - gradeA; // Highest first
      case "status":
        return getSubmissionStatusText(a).localeCompare(
          getSubmissionStatusText(b)
        );
      default:
        return 0;
    }
  });
});

// Methods
const fetchHomeworkDetails = async (homeworkId) => {
  try {
    const response = await groupHomeworksAPI.getById(homeworkId);
    homework.value = response.data || response;
  } catch (err) {
    console.error("Error fetching homework details:", err);
  }
};

const fetchSubmissions = async (homeworkId) => {
  isLoading.value = true;
  try {
    const response = await homeworkSubmissionsAPI.getByHomeworkId(homeworkId);
    const submissionsData = response.data || response;

    // Process submissions data to calculate overall scores and format properly
    const processedSubmissions = Array.isArray(submissionsData)
      ? submissionsData.map((submission) => {
          // Calculate average score from sections
          const sections = submission.sections || [];
          const totalScore = sections.reduce(
            (sum, section) => sum + (section.score || 0),
            0
          );
          const averageScore =
            sections.length > 0 ? Math.round(totalScore / sections.length) : 0;

          return {
            ...submission,
            student_name: submission.student
              ? `${submission.student.first_name} ${submission.student.last_name}`
              : "Unknown Student",
            submitted_at: submission.createdAt,
            grade: averageScore > 0 ? averageScore : null,
            sections_count: sections.length,
            sections: sections,
          };
        })
      : [];

    submissions.value = processedSubmissions;
    error.value = "";
  } catch (err) {
    error.value = `Failed to fetch submissions: ${
      err.message || "Unknown error"
    }`;
    console.error("Error fetching submissions:", err);
    submissions.value = [];
  } finally {
    isLoading.value = false;
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

const getHomeworkStatusVariant = (homework) => {
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

const getHomeworkStatusText = (homework) => {
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

const hasUngraduatedWritingSections = (submission) => {
  if (!submission.sections) return false;
  return submission.sections.some(
    (section) => section.section === "writing" && section.score === 0
  );
};

const getSubmissionStatusVariant = (submission) => {
  if (!submission.submitted_at) return "secondary"; // Not submitted
  if (submission.sections && submission.sections.length > 0) {
    if (hasUngraduatedWritingSections(submission)) return "secondary"; // Needs grading
    if (isLateSubmission(submission)) return "destructive"; // Late
    return "default"; // Completed
  }
  return "secondary"; // Submitted but incomplete
};

const getSubmissionStatusText = (submission) => {
  if (!submission.submitted_at) return "Not Submitted";
  if (submission.sections && submission.sections.length > 0) {
    if (hasUngraduatedWritingSections(submission)) return "Needs Review";
    if (isLateSubmission(submission)) return "Late Submission";
    return "Completed";
  }
  return "In Progress";
};

const getGradeVariant = (grade) => {
  if (grade >= 80) return "default"; // Good grade
  if (grade >= 60) return "secondary"; // Average grade
  return "destructive"; // Poor grade
};

const isLateSubmission = (submission) => {
  if (!submission.submitted_at || !homework.value?.deadline) return false;
  return new Date(submission.submitted_at) > new Date(homework.value.deadline);
};

const viewSubmissionDetails = (submission) => {
  selectedSubmission.value = submission;
  showDetailsModal.value = true;
};

const closeGradeModal = () => {
  showGradeModal.value = false;
  selectedSubmission.value = null;
};

const gradeSectionSubmission = (section) => {
  selectedSection.value = section;
  sectionGradeForm.value = {
    score: section.score ? section.score.toString() : "",
  };
  showSectionGradeModal.value = true;
  showDetailsModal.value = false;
};

const closeSectionGradeModal = () => {
  showSectionGradeModal.value = false;
  selectedSection.value = null;
  sectionGradeForm.value = { score: "" };
};

const submitSectionGrade = async () => {
  if (!selectedSection.value || !sectionGradeForm.value.score) {
    error.value = "Please enter a score";
    return;
  }

  isSubmitting.value = true;
  try {
    const updateData = {
      homework_id: selectedSubmission.value.homework_id,
      student_id: selectedSubmission.value.student_id,
      lesson_id: selectedSubmission.value.lesson_id,
      exercise_id: selectedSection.value.exercise_id,
      speaking_id: selectedSection.value.speaking_id,
      score: parseFloat(sectionGradeForm.value.score),
      section: selectedSection.value.section,
      answers: selectedSection.value.answers,
    };

    // Update the section using the homework submission API
    await homeworkSubmissionsAPI.update(selectedSection.value.id, updateData);

    // Update local section data
    const submissionIndex = submissions.value.findIndex(
      (s) => s.id === selectedSubmission.value.id
    );
    if (submissionIndex !== -1) {
      const sectionIndex = submissions.value[
        submissionIndex
      ].sections.findIndex((sec) => sec.id === selectedSection.value.id);
      if (sectionIndex !== -1) {
        submissions.value[submissionIndex].sections[sectionIndex] = {
          ...submissions.value[submissionIndex].sections[sectionIndex],
          score: parseFloat(sectionGradeForm.value.score),
        };

        // Recalculate overall grade
        const sections = submissions.value[submissionIndex].sections;
        const totalScore = sections.reduce(
          (sum, section) => sum + (section.score || 0),
          0
        );
        const averageScore =
          sections.length > 0 ? Math.round(totalScore / sections.length) : 0;
        submissions.value[submissionIndex].grade =
          averageScore > 0 ? averageScore : null;
      }
    }

    closeSectionGradeModal();
    error.value = "";
  } catch (err) {
    error.value = `Failed to save section grade: ${
      err.message || "Unknown error"
    }`;
    console.error("Error saving section grade:", err);
  } finally {
    isSubmitting.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  const homeworkId = route.params.homeworkId;
  if (homeworkId) {
    await Promise.all([
      fetchHomeworkDetails(homeworkId),
      fetchSubmissions(homeworkId),
    ]);

    // Set group name from route query if available
    if (route.query.groupName) {
      groupName.value = route.query.groupName;
    }
  }
});
</script>
