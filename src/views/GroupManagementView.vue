<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.js";
import {
  groupsAPI,
  studentsAPI,
  attendanceAPI,
  groupStudentsAPI,
} from "@/utils/api.js";

// Shadcn Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Lucide Icons
import {
  ArrowLeft,
  Plus,
  Users,
  CalendarCheck,
  Trash2,
  X,
  User,
  Phone,
  RefreshCw,
  RotateCcw,
} from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const groupId = ref(route.params.id);
const group = ref(null);
const students = ref([]);
const attendance = ref([]);
const isLoading = ref(false);
const error = ref("");
const activeTab = ref("students");

// Form data for adding students
const showAddStudentModal = ref(false);
const allStudents = ref([]);
const filteredStudents = ref([]);
const selectedStudentsToAdd = ref([]);
const searchTerm = ref("");
const isLoadingAllStudents = ref(false);
const searchError = ref("");

// Form data for attendance creation
const showAttendanceModal = ref(false);
const attendanceDate = ref(new Date().toISOString().split("T")[0]);
const attendanceStatuses = ref({});

// Computed properties
const groupName = computed(() => group.value?.name || "Group");

// Functions
const fetchGroup = async () => {
  if (!groupId.value) return;

  try {
    const response = await groupsAPI.getById(groupId.value);
    group.value = response.data || response;
  } catch (err) {
    console.error("Error fetching group:", err);
    error.value = "Failed to load group details";
  }
};

const fetchStudents = async () => {
  if (!groupId.value) return;

  isLoading.value = true;
  try {
    // Use the new groupStudentsAPI to get students by group ID
    const response = await groupStudentsAPI.getByGroupId(groupId.value);
    console.log("Group students data:", response); // Log to understand the data structure

    students.value = response.data || response || [];

    // Ensure each student object has the necessary properties
    students.value = students.value.map((student) => {
      // If the student data is nested within a group_student object, extract it properly
      if (student.student) {
        return {
          ...student.student,
          group_student_id: student.id, // Store the relationship ID for removal
          status: student.status,
          enrolled_at: student.enrolled_at,
        };
      }
      return student;
    });

    error.value = "";
  } catch (err) {
    console.error("Error fetching students:", err);
    error.value = "Failed to load students";
    students.value = [];
  } finally {
    isLoading.value = false;
  }
};

const fetchAllStudents = async () => {
  isLoadingAllStudents.value = true;
  try {
    const response = await studentsAPI.getAll();
    allStudents.value = response.data || response || [];

    // Filter out students already in the group
    filterAvailableStudents();

    error.value = "";
  } catch (err) {
    console.error("Error fetching all students:", err);
    searchError.value = "Failed to load students";
    allStudents.value = [];
  } finally {
    isLoadingAllStudents.value = false;
  }
};

const filterAvailableStudents = () => {
  // Get IDs of students already in the group
  const groupStudentIds = students.value.map(
    (student) => student.user_id || student.id
  );

  // Filter all students to exclude those already in the group
  filteredStudents.value = allStudents.value.filter(
    (student) => !groupStudentIds.includes(student.id)
  );

  if (searchTerm.value) {
    // Filter further by search term
    const term = searchTerm.value.toLowerCase();
    filteredStudents.value = filteredStudents.value.filter(
      (student) =>
        student.first_name.toLowerCase().includes(term) ||
        student.last_name.toLowerCase().includes(term)
    );
  }
};

// Date helpers for attendance
const today = new Date();
const startDate = ref(
  new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]
); // First day of current month
const endDate = ref(
  new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0]
); // Last day of current month

const fetchAttendance = async () => {
  if (!groupId.value) return;

  try {
    // Use the new API endpoint with date range
    const response = await attendanceAPI.getByGroupIdAndDateRange(
      groupId.value,
      startDate.value,
      endDate.value
    );
    console.log("Attendance data:", response); // Log to understand the attendance data structure
    attendance.value = response.data || response || [];
  } catch (err) {
    console.error("Error fetching attendance:", err);
    error.value = "Failed to load attendance data";
  }
};

const goBack = () => {
  router.push("/groups");
};

const filterStudents = () => {
  filterAvailableStudents();
};

const toggleStudentSelection = (student) => {
  const index = selectedStudentsToAdd.value.findIndex(
    (s) => s.user_id === student.user_id
  );
  if (index === -1) {
    selectedStudentsToAdd.value.push(student);
  } else {
    selectedStudentsToAdd.value.splice(index, 1);
  }
};

const isStudentSelected = (studentId) => {
  return selectedStudentsToAdd.value.some(
    (student) => student.user_id === studentId
  );
};

const openAddStudentModal = async () => {
  selectedStudentsToAdd.value = [];
  searchTerm.value = "";
  await fetchAllStudents();
  showAddStudentModal.value = true;
};

const closeAddStudentModal = () => {
  showAddStudentModal.value = false;
  selectedStudentsToAdd.value = [];
  searchTerm.value = "";
};

const openCreateAttendanceModal = () => {
  // Initialize attendance with current group students
  attendanceStatuses.value = {};
  students.value.forEach((student) => {
    // Make sure we use the correct ID (could be in student.id or student.student_id)
    const studentId = student.user_id;
    if (studentId) {
      attendanceStatuses.value[studentId] = "present";
    }
  });

  attendanceDate.value = new Date().toISOString().split("T")[0];
  showAttendanceModal.value = true;
};

const closeAttendanceModal = () => {
  showAttendanceModal.value = false;
};

const addStudent = async () => {
  if (selectedStudentsToAdd.value.length === 0) {
    error.value = "Please select at least one student to add";
    return;
  }

  try {
    error.value = "";
    const currentDate = new Date().toISOString();

    // Add all selected students to the group
    const promises = selectedStudentsToAdd.value.map((student) => {
      // Ensure we have all the required fields with proper formats
      const groupStudentData = {
        student_id: student.user_id, // This must be a valid UUID from the existing student
        group_id: groupId.value,
        enrolled_at: currentDate, // Current date in ISO format
        status: "active", // Using 'active' as the default status
        created_by: authStore.user.id, // Add the teacher who created this enrollment
      };
      return groupStudentsAPI.addToGroup(groupStudentData);
    });

    await Promise.all(promises);

    // Refresh the students list to show the newly added students
    await fetchStudents();
    closeAddStudentModal();
  } catch (err) {
    console.error("Error adding students:", err);
    if (err.response && err.response.data && err.response.data.message) {
      // Display the specific validation error message from the server
      error.value = Array.isArray(err.response.data.message)
        ? err.response.data.message.join(", ")
        : err.response.data.message;
    } else {
      error.value = "Failed to add students to the group";
    }
  }
};

const createAttendance = async () => {
  try {
    error.value = "";
    const teacherId = JSON.parse(localStorage.getItem("user"))?.id;
    // Validate teacher ID
    if (!teacherId) {
      error.value = "Teacher ID is missing. Please ensure you are logged in.";
      return;
    }

    // Prepare bulk attendance data for all students
    const attendanceRecords = students.value.map((student) => {
      // Make sure we have the correct student ID (could be in student_id or id field)
      const studentId = student.user_id || student.id;

      if (!studentId) {
        throw new Error(`Student ID is missing for student ${student.name}`);
      }

      return {
        student_id: studentId, // Ensure this is a valid UUID
        date: attendanceDate.value,
        status:
          attendanceStatuses.value[student.user_id || studentId] || "present",
        group_id: groupId.value,
        teacher_id: teacherId, // Ensure this is a valid UUID
        note: "",
      };
    });

    console.log("Creating bulk attendance records:", attendanceRecords);

    // Send bulk data to API
    await attendanceAPI.createBulk(attendanceRecords);

    // Refresh the attendance data
    await fetchAttendance();
    closeAttendanceModal();
  } catch (err) {
    console.error("Error creating attendance records:", err);

    if (err.response && err.response.data && err.response.data.message) {
      // Display the specific validation error message from the server
      error.value = Array.isArray(err.response.data.message)
        ? err.response.data.message.join(", ")
        : err.response.data.message;
    } else if (err.message) {
      error.value = err.message;
    } else {
      error.value = "Failed to create attendance records";
    }
  }
};

const removeStudent = async (student) => {
  if (
    !confirm(`Are you sure you want to remove ${student.name} from this group?`)
  )
    return;

  try {
    // Use the new groupStudentsAPI to remove the student from the group
    // We need to use the group_student_id which is the ID of the relationship, not the student ID
    const groupStudentId = student.group_student_id || student.id;

    await groupStudentsAPI.removeFromGroup(groupStudentId);
    students.value = students.value.filter((s) => s.id !== student.id);
    error.value = "";

    // Refresh all students list if the modal is open
    await fetchStudents();
  } catch (err) {
    console.error("Error removing student:", err);
    if (err.response && err.response.data && err.response.data.message) {
      // Display the specific error message from the server
      error.value = Array.isArray(err.response.data.message)
        ? err.response.data.message.join(", ")
        : err.response.data.message;
    } else {
      error.value = "Failed to remove student";
    }
  }
};

const markAttendance = async (id, status) => {
  try {
    await attendanceAPI.update(id, status);
    await fetchAttendance(); // Refresh attendance data
    error.value = "";
  } catch (err) {
    console.error("Error marking attendance:", err);

    if (err.response && err.response.data && err.response.data.message) {
      // Display the specific validation error message from the server
      error.value = Array.isArray(err.response.data.message)
        ? err.response.data.message.join(", ")
        : err.response.data.message;
    } else {
      error.value = "Failed to mark attendance";
    }
  }
};

// Lifecycle
onMounted(() => {
  fetchGroup();
  fetchStudents();
  fetchAttendance();
});
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="p-4 sm:p-6 border-b bg-background">
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div class="flex items-center gap-4">
          <Button
            variant="outline"
            @click="goBack"
            class="flex items-center gap-2"
          >
            <ArrowLeft class="h-4 w-4" />
            <span class="hidden sm:inline">Back to Groups</span>
          </Button>
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
              {{ groupName }}
            </h1>
            <p class="text-muted-foreground">Group Management</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="p-4 sm:p-6">
      <Alert variant="destructive">
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>
    </div>

    <!-- Main Content -->
    <div class="flex-1 p-4 sm:p-6">
      <Tabs
        :model-value="activeTab"
        @update:model-value="activeTab = $event"
        class="h-full flex flex-col"
      >
        <TabsList class="grid w-fit grid-cols-2 h-9">
          <TabsTrigger
            value="students"
            class="flex items-center gap-1 px-3 py-1 text-sm"
          >
            <Users class="h-3 w-3" />
            <span class="hidden sm:inline">Students</span>
            <Badge variant="secondary" class="ml-1 text-xs px-1 py-0">{{
              students.length
            }}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            class="flex items-center gap-1 px-3 py-1 text-sm"
          >
            <CalendarCheck class="h-3 w-3" />
            <span class="hidden sm:inline">Attendance</span>
          </TabsTrigger>
        </TabsList>

        <!-- Students Tab -->
        <TabsContent value="students" class="flex-1 mt-6">
          <div class="space-y-6">
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-semibold">Group Students</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    @click="openAddStudentModal"
                    class="flex items-center gap-2"
                  >
                    <Plus class="h-4 w-4" />
                    Add Student
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>

            <!-- Loading State -->
            <div
              v-if="isLoading"
              class="flex flex-col items-center justify-center py-12"
            >
              <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
              ></div>
              <p class="text-muted-foreground mt-4">Loading students...</p>
            </div>

            <!-- No Students State -->
            <Card v-else-if="students.length === 0" class="text-center py-12">
              <CardContent class="pt-6">
                <Users class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle class="mb-2">No students yet</CardTitle>
                <CardDescription class="mb-4"
                  >Add your first student to this group</CardDescription
                >
                <Button
                  @click="openAddStudentModal"
                  class="flex items-center gap-2 mx-auto"
                >
                  <Plus class="h-4 w-4" />
                  Add Student
                </Button>
              </CardContent>
            </Card>

            <!-- Students Table -->
            <Card v-else>
              <CardContent class="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enrolled Date</TableHead>
                      <TableHead class="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="student in students" :key="student.id">
                      <TableCell>
                        <div class="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              <User class="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div class="font-medium">
                              {{ student.first_name }} {{ student.last_name }}
                            </div>
                            <div
                              v-if="student.email"
                              class="text-sm text-muted-foreground"
                            >
                              {{ student.email }}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          v-if="student.phone"
                          class="flex items-center gap-2 text-sm"
                        >
                          <Phone class="h-3 w-3" />
                          {{ student.phone }}
                        </div>
                        <span v-else class="text-muted-foreground">-</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          :variant="
                            student.status === 'active'
                              ? 'default'
                              : student.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                          "
                        >
                          {{ student.status || "active" }}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span v-if="student.enrolled_at" class="text-sm">
                          {{
                            new Date(student.enrolled_at).toLocaleDateString()
                          }}
                        </span>
                        <span v-else class="text-muted-foreground">-</span>
                      </TableCell>
                      <TableCell class="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="removeStudent(student)"
                          class="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 class="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <!-- Attendance Tab -->
        <TabsContent value="attendance" class="flex-1 mt-6">
          <div class="space-y-6">
            <Card>
              <CardHeader>
                <div
                  class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <CardTitle>Attendance Records</CardTitle>
                    <CardDescription
                      >Track student attendance for this group</CardDescription
                    >
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        @click="openCreateAttendanceModal"
                        variant="default"
                        class="flex items-center gap-2"
                      >
                        <Plus class="h-4 w-4" />
                        Create Attendance
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>

                <!-- Date Range Selection -->
                <div class="flex flex-col sm:flex-row gap-4 mt-4">
                  <div class="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      v-model="startDate"
                      @change="fetchAttendance"
                    />
                  </div>
                  <div class="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      v-model="endDate"
                      @change="fetchAttendance"
                    />
                  </div>
                  <div class="flex items-end">
                    <Button
                      @click="fetchAttendance"
                      variant="outline"
                      class="flex items-center gap-2"
                    >
                      <RefreshCw class="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <!-- Attendance Table -->
                <div class="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead class="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow v-if="attendance.length === 0">
                        <TableCell colspan="4" class="text-center py-8">
                          <div class="flex flex-col items-center gap-2">
                            <CalendarCheck
                              class="h-8 w-8 text-muted-foreground"
                            />
                            <p class="text-muted-foreground">
                              No attendance records found
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow v-for="record in attendance" :key="record.id">
                        <TableCell>
                          {{ new Date(record.date).toLocaleDateString() }}
                        </TableCell>
                        <TableCell>
                          {{
                            `${record?.student?.first_name || ""} ${
                              record?.student?.last_name || ""
                            }`
                          }}
                        </TableCell>
                        <TableCell>
                          <Badge
                            :variant="
                              record.status === 'present'
                                ? 'default'
                                : 'destructive'
                            "
                          >
                            {{
                              record.status === "present" ? "Present" : "Absent"
                            }}
                          </Badge>
                        </TableCell>
                        <TableCell class="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            @click="
                              markAttendance(
                                record?.id,
                                record.status === 'present'
                                  ? 'absent'
                                  : 'present'
                              )
                            "
                          >
                            <RotateCcw class="h-4 w-4 mr-2" />
                            Toggle
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>

    <!-- Add Student Dialog -->
    <Dialog v-model:open="showAddStudentModal">
      <DialogContent class="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Students to Group</DialogTitle>
          <DialogDescription>
            Select students from the list below to add them to this group.
          </DialogDescription>

          <Button
            @click="addStudent"
            :disabled="selectedStudentsToAdd.length === 0"
          >
            Add Selected Students
          </Button>
        </DialogHeader>

        <div class="space-y-4">
          <!-- Search filter -->
          <div class="space-y-2">
            <Label>Filter Students</Label>
            <Input
              v-model="searchTerm"
              @input="filterStudents"
              placeholder="Filter by first name or last name"
            />
            <Alert v-if="searchError" variant="destructive" class="mt-2">
              <AlertDescription>{{ searchError }}</AlertDescription>
            </Alert>
          </div>

          <!-- Selected students counter -->
          <div class="text-sm text-muted-foreground">
            <Badge variant="secondary">{{
              selectedStudentsToAdd.length
            }}</Badge>
            students selected
          </div>

          <!-- Students list -->
          <div class="border rounded-lg">
            <div
              v-if="isLoadingAllStudents"
              class="flex items-center justify-center py-8"
            >
              <div
                class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"
              ></div>
              <p class="text-muted-foreground ml-3">Loading students...</p>
            </div>

            <div
              v-else-if="filteredStudents.length === 0"
              class="text-center py-8"
            >
              <Users class="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p class="text-muted-foreground">No students found</p>
            </div>

            <div v-else class="max-h-96 overflow-y-auto">
              <div
                v-for="student in filteredStudents"
                :key="student.id"
                @click="toggleStudentSelection(student)"
                class="flex items-center p-4 border-b border-border last:border-b-0 hover:bg-accent cursor-pointer"
                :class="{
                  'bg-accent': isStudentSelected(student.user_id || student.id),
                }"
              >
                <Avatar class="mr-3">
                  <AvatarFallback>
                    {{ student?.first_name?.[0] }}{{ student?.last_name?.[0] }}
                  </AvatarFallback>
                </Avatar>
                <div class="flex-1">
                  <div class="font-medium">
                    {{ student?.first_name }} {{ student?.last_name }}
                  </div>
                  <div
                    v-if="student?.phone"
                    class="text-sm text-muted-foreground flex items-center gap-1"
                  >
                    <Phone class="h-3 w-3" />
                    {{ student?.phone }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="closeAddStudentModal">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Create Attendance Dialog -->
    <Dialog v-model:open="showAttendanceModal">
      <DialogContent class="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Create Attendance Records</DialogTitle>
          <DialogDescription>
            Mark attendance for all students in this group for the selected
            date.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-6">
          <!-- Date selection -->
          <div class="space-y-2">
            <Label>Attendance Date</Label>
            <Input type="date" v-model="attendanceDate" />
          </div>

          <!-- Students attendance list -->
          <div class="space-y-4">
            <div v-if="students.length === 0" class="text-center py-8">
              <Users class="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p class="text-muted-foreground">No students in this group</p>
            </div>

            <div v-else class="space-y-2">
              <Label>Student Attendance</Label>
              <div class="border rounded-lg max-h-96 overflow-y-auto">
                <div
                  v-for="student in students"
                  :key="student.id"
                  class="flex items-center justify-between p-4 border-b border-border last:border-b-0"
                >
                  <div class="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {{ student?.first_name?.[0]
                        }}{{ student?.last_name?.[0] }}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div class="font-medium">
                        {{ student.first_name || student.name }}
                      </div>
                      <div class="text-sm text-muted-foreground">
                        {{ student.last_name || student.email }}
                      </div>
                    </div>
                  </div>

                  <RadioGroup
                    :model-value="attendanceStatuses[student.user_id]"
                    @update:model-value="
                      attendanceStatuses[student.user_id] = $event
                    "
                    class="flex gap-6"
                  >
                    <div class="flex items-center space-x-2">
                      <RadioGroupItem
                        :value="'present'"
                        :id="`present-${student.user_id}`"
                      />
                      <Label
                        :for="`present-${student.user_id}`"
                        class="text-green-700"
                        >Present</Label
                      >
                    </div>
                    <div class="flex items-center space-x-2">
                      <RadioGroupItem
                        :value="'absent'"
                        :id="`absent-${student.user_id}`"
                      />
                      <Label
                        :for="`absent-${student.user_id}`"
                        class="text-red-700"
                        >Absent</Label
                      >
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="closeAttendanceModal">
            Cancel
          </Button>
          <Button @click="createAttendance" :disabled="students.length === 0">
            Save Attendance Records
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
