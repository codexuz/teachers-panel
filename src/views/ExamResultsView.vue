<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-3xl font-bold tracking-tight">Exam Results</h2>
        <p v-if="selectedExam" class="text-muted-foreground mt-1">
          {{ selectedExam.title }} - {{ formatDate(selectedExam.scheduled_at) }}
        </p>
      </div>
      <Button v-if="selectedExam" @click="openAddResultDialog">
        <Plus class="mr-2 h-4 w-4" />
        Add Result
      </Button>
    </div>

    <!-- Statistics Cards -->
    <div
      v-if="selectedExam && results.length > 0"
      class="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
    >
      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Total Students</CardTitle>
          <Users class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ results.length }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Passed</CardTitle>
          <CheckCircle class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-green-600">{{ passedCount }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Failed</CardTitle>
          <XCircle class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-red-600">{{ failedCount }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Average Score</CardTitle>
          <TrendingUp class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ averageScore }}%</div>
        </CardContent>
      </Card>
    </div>

    <!-- Results Table -->
    <Card v-if="selectedExam">
      <CardHeader>
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <Input
              v-model="searchQuery"
              placeholder="Search by student name..."
            />
          </div>
          <Select
            v-model="filterResult"
            @update:modelValue="(value) => (filterResult = value)"
          >
            <SelectTrigger class="w-[180px]">
              <SelectValue placeholder="Filter by result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="text-center">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"
            ></div>
            <p class="mt-4 text-muted-foreground">Loading results...</p>
          </div>
        </div>

        <div v-else-if="filteredResults.length === 0" class="text-center py-12">
          <p class="text-muted-foreground">No results found</p>
        </div>

        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Percentage</TableHead>
              <TableHead>Result</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="result in filteredResults" :key="result.id">
              <TableCell class="font-medium">{{
                getStudentName(result)
              }}</TableCell>
              <TableCell>{{ result.score }} / {{ result.max_score }}</TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <div class="w-24 bg-secondary rounded-full h-2">
                    <div
                      class="h-2 rounded-full transition-all"
                      :class="
                        result.percentage >= 60 ? 'bg-green-600' : 'bg-red-600'
                      "
                      :style="{ width: result.percentage + '%' }"
                    ></div>
                  </div>
                  <span class="text-sm font-medium"
                    >{{ result.percentage }}%</span
                  >
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  :variant="
                    result.result === 'passed' ? 'default' : 'destructive'
                  "
                >
                  {{ result.result === "passed" ? "Passed" : "Failed" }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button
                    @click="viewDetails(result)"
                    variant="ghost"
                    size="sm"
                  >
                    <Eye class="h-4 w-4" />
                  </Button>
                  <Button @click="editResult(result)" variant="ghost" size="sm">
                    <Edit class="h-4 w-4" />
                  </Button>
                  <Button
                    @click="deleteResult(result.id)"
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Add/Edit Result Dialog -->
    <Dialog :open="showDialog" @update:open="showDialog = $event">
      <DialogContent class="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{
            isEditing ? "Edit Result" : "Add New Result"
          }}</DialogTitle>
        </DialogHeader>

        <form @submit.prevent="submitForm" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Student</Label>
              <Select
                :model-value="formData.student_id"
                @update:model-value="(value) => (formData.student_id = value)"
                :disabled="isEditing"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="student in students"
                    :key="student.user_id"
                    :value="student.user_id"
                  >
                    {{ getStudentDisplayName(student) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label>Max Score</Label>
              <Input
                v-model.number="formData.max_score"
                type="number"
                required
                min="0"
                placeholder="100"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label>Total Score</Label>
            <Input
              v-model.number="formData.score"
              type="number"
              required
              min="0"
              :max="formData.max_score"
              @input="calculatePercentage"
              placeholder="85"
            />
          </div>

          <div class="space-y-3">
            <Label>Section Scores</Label>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div
                v-for="section in sectionsList"
                :key="section"
                class="space-y-1"
              >
                <Label class="text-xs">{{ formatSection(section) }}</Label>
                <Input
                  v-model.number="formData.section_scores[section]"
                  type="number"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <Label>Feedback</Label>
            <Textarea
              v-model="formData.feedback"
              rows="3"
              placeholder="Enter feedback for the student..."
            />
          </div>

          <Card>
            <CardContent class="pt-6">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium">Percentage:</span>
                <span class="text-lg font-bold"
                  >{{ formData.percentage }}%</span
                >
              </div>
              <div class="flex justify-between items-center mt-2">
                <span class="text-sm font-medium">Result:</span>
                <Badge
                  :variant="
                    formData.result === 'passed' ? 'default' : 'destructive'
                  "
                >
                  {{ formData.result === "passed" ? "Passed" : "Failed" }}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div class="flex justify-end gap-3">
            <Button type="button" variant="outline" @click="closeDialog"
              >Cancel</Button
            >
            <Button type="submit" :disabled="submitting">
              {{
                submitting ? "Saving..." : isEditing ? "Update" : "Add Result"
              }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Details Dialog -->
    <Dialog :open="showDetailsDialog" @update:open="showDetailsDialog = $event">
      <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Result Details</DialogTitle>
        </DialogHeader>

        <div v-if="selectedResult" class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-muted-foreground">Student</p>
              <p class="text-lg font-semibold">
                {{ getStudentName(selectedResult.student_id) }}
              </p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Score</p>
              <p class="text-lg font-semibold">
                {{ selectedResult.score }} / {{ selectedResult.max_score }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-muted-foreground">Percentage</p>
              <p class="text-lg font-semibold">
                {{ selectedResult.percentage }}%
              </p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Result</p>
              <Badge
                :variant="
                  selectedResult.result === 'passed' ? 'default' : 'destructive'
                "
              >
                {{ selectedResult.result === "passed" ? "Passed" : "Failed" }}
              </Badge>
            </div>
          </div>

          <div v-if="selectedResult.section_scores">
            <h4 class="text-lg font-semibold mb-3">Section Scores</h4>
            <div class="grid grid-cols-2 gap-3">
              <div
                v-for="(score, section) in selectedResult.section_scores"
                :key="section"
              >
                <Card>
                  <CardContent class="pt-4">
                    <p class="text-xs text-muted-foreground mb-2">
                      {{ formatSection(section) }}
                    </p>
                    <div class="flex items-center gap-2">
                      <div class="w-full bg-secondary rounded-full h-2">
                        <div
                          class="bg-primary h-2 rounded-full"
                          :style="{ width: score + '%' }"
                        ></div>
                      </div>
                      <span class="text-sm font-semibold">{{ score }}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div v-if="selectedResult.feedback">
            <h4 class="text-lg font-semibold mb-2">Feedback</h4>
            <Card>
              <CardContent class="pt-4">
                <p class="text-sm">{{ selectedResult.feedback }}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  examsAPI,
  examResultsAPI,
  groupStudentsAPI,
  studentsAPI,
} from "../utils/api";
import { useAuthStore } from "@/stores/auth.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Plus,
} from "lucide-vue-next";

const authStore = useAuthStore();
const route = useRoute();

// State
const results = ref([]);
const students = ref([]);
const selectedExamId = ref(route.query.examId || "");
const selectedExam = ref(null);
const selectedResult = ref(null);
const loading = ref(false);
const submitting = ref(false);
const showDialog = ref(false);
const showDetailsDialog = ref(false);
const isEditing = ref(false);
const searchQuery = ref("");
const filterResult = ref("all");

const sectionsList = [
  "reading",
  "writing",
  "listening",
  "speaking",
  "grammar",
  "vocabulary",
];

// Form data
const formData = ref({
  id: null,
  exam_id: "",
  student_id: "",
  score: 0,
  max_score: 100,
  percentage: 0,
  result: "failed",
  section_scores: {
    reading: 0,
    writing: 0,
    listening: 0,
    speaking: 0,
    grammar: 0,
    vocabulary: 0,
  },
  feedback: "",
  is_completed: false,
});

// Computed properties
const passedCount = computed(() => {
  return results.value.filter((r) => r.result === "passed").length;
});

const failedCount = computed(() => {
  return results.value.filter((r) => r.result === "failed").length;
});

const averageScore = computed(() => {
  if (results.value.length === 0) return 0;
  const sum = results.value.reduce((acc, r) => acc + r.percentage, 0);
  return (sum / results.value.length).toFixed(1);
});

const filteredResults = computed(() => {
  return results.value.filter((result) => {
    const studentName = getStudentName(result).toLowerCase();
    const matchesSearch = studentName.includes(searchQuery.value.toLowerCase());
    const matchesFilter =
      filterResult.value === "all" || result.result === filterResult.value;
    return matchesSearch && matchesFilter;
  });
});

// Methods
const fetchExam = async (examId) => {
  try {
    const response = await examsAPI.getById(examId);
    selectedExam.value = response.data || response;
  } catch (error) {
    console.error("Error fetching exam:", error);
  }
};

const fetchResults = async (examId) => {
  loading.value = true;
  try {
    const response = await examResultsAPI.getByExamId(examId);
    const rawResults = Array.isArray(response) ? response : response.data || [];

    // Ensure percentage is a number for comparisons
    results.value = rawResults.map((result) => ({
      ...result,
      percentage: parseFloat(result.percentage),
    }));

    console.log("Fetched results:", results.value);
  } catch (error) {
    console.error("Error fetching results:", error);
    alert("Failed to load results. Please try again.");
  } finally {
    loading.value = false;
  }
};

const fetchStudents = async (groupId) => {
  try {
    const response = await groupStudentsAPI.getByGroupId(groupId);
    const groupStudents = Array.isArray(response)
      ? response
      : response.data || [];
    console.log("Fetched group students:", groupStudents);
    console.log("Group ID:", groupId);

    // If the API returns student objects directly with the group-student relationship
    if (groupStudents.length > 0 && groupStudents[0].student) {
      students.value = groupStudents.map((gs) => ({
        ...gs.student,
        id: gs.student.user_id || gs.student.id,
      }));
    } else if (groupStudents.length > 0 && groupStudents[0].student_id) {
      // If we only have student IDs, fetch full student details
      const studentIds = groupStudents.map((gs) => gs.student_id);
      const studentPromises = studentIds.map((id) => studentsAPI.getById(id));
      const studentResponses = await Promise.all(studentPromises);
      students.value = studentResponses.map((res) => res.data || res);
    } else {
      // Assume groupStudents are the actual student objects
      students.value = groupStudents;
    }

    console.log("Processed students:", students.value);
  } catch (error) {
    console.error("Error fetching students:", error);
  }
};

const calculatePercentage = () => {
  if (formData.value.max_score > 0) {
    formData.value.percentage = parseFloat(
      ((formData.value.score / formData.value.max_score) * 100).toFixed(1)
    );
    formData.value.result =
      formData.value.percentage >= 60 ? "passed" : "failed";
  }
};

const openAddResultDialog = () => {
  isEditing.value = false;
  resetForm();
  formData.value.exam_id = selectedExamId.value;
  showDialog.value = true;
};

const editResult = (result) => {
  isEditing.value = true;
  formData.value = {
    id: result.id,
    exam_id: result.exam_id,
    student_id: result.student_id,
    score: result.score,
    max_score: result.max_score,
    percentage: result.percentage,
    result: result.result,
    section_scores: { ...result.section_scores },
    feedback: result.feedback || "",
    is_completed: result.is_completed,
  };
  showDialog.value = true;
};

const viewDetails = (result) => {
  selectedResult.value = result;
  showDetailsDialog.value = true;
};

const closeDialog = () => {
  showDialog.value = false;
  resetForm();
};

const resetForm = () => {
  formData.value = {
    id: null,
    exam_id: "",
    student_id: "",
    score: 0,
    max_score: 100,
    percentage: 0,
    result: "failed",
    section_scores: {
      reading: 0,
      writing: 0,
      listening: 0,
      speaking: 0,
      grammar: 0,
      vocabulary: 0,
    },
    feedback: "",
    is_completed: false,
  };
};

const submitForm = async () => {
  submitting.value = true;
  try {
    calculatePercentage();
    if (isEditing.value) {
      await examResultsAPI.update(formData.value.id, formData.value);
    } else {
      await examResultsAPI.create(formData.value);
    }
    closeDialog();
    fetchResults(selectedExamId.value);
  } catch (error) {
    console.error("Error saving result:", error);
    alert("Failed to save result. Please try again.");
  } finally {
    submitting.value = false;
  }
};

const deleteResult = async (id) => {
  if (!confirm("Are you sure you want to delete this result?")) return;

  try {
    await examResultsAPI.delete(id);
    fetchResults(selectedExamId.value);
  } catch (error) {
    console.error("Error deleting result:", error);
    alert("Failed to delete result. Please try again.");
  }
};

// Utility methods
const getStudentDisplayName = (student) => {
  if (!student) return "Unknown Student";
  // Try different name field combinations
  if (student.first_name && student.last_name) {
    return `${student.first_name} ${student.last_name}`;
  }
  if (student.first_name) return student.first_name;
  if (student.last_name) return student.last_name;
  return (
    student.name ||
    student.full_name ||
    student.student_name ||
    "Unknown Student"
  );
};

const getStudentName = (result) => {
  // First check if result has nested student object
  if (result.student) {
    return getStudentDisplayName(result.student);
  }

  // Fall back to finding student in students array
  const studentId = result.student_id || result;
  const student = students.value.find(
    (s) =>
      s.id === studentId ||
      s.student_id === studentId ||
      s.user_id === studentId
  );
  return getStudentDisplayName(student);
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

const formatSection = (section) => {
  return section.charAt(0).toUpperCase() + section.slice(1);
};

// Lifecycle
onMounted(async () => {
  // If examId is provided in query, fetch that exam's results
  if (route.query.examId) {
    await fetchExam(route.query.examId);
    if (selectedExam.value) {
      await fetchResults(route.query.examId);
      await fetchStudents(selectedExam.value.group_id);
    }
  }
});
</script>
