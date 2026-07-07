import Dexie, { type Table } from 'dexie';

export interface LocalStudent {
  id?: number;
  numAdmission: string;
  nomEtudiant: string;
  nomArabe?: string | null;
  sexe?: string | null;
  religion?: string | null;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  cnic?: string | null;
  groupeSanguin?: string | null;
  session?: string | null;
  educationalLevel?: string | null;
  classe?: string | null;
  section?: string | null;
  categorie?: string | null;
  nomPere?: string | null;
  cnicPere?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
  fraisMensuels?: number;
  ancienSolde?: number;
  fraisInscription?: number;
  statut?: string;
  behaviorScore?: number;
  photoPath?: string | null;
  updatedAt?: number;
}

export interface LocalExam {
  id?: number;
  examName: string;
  classId: number;
  subjectId: number;
  examDate?: string | null;
  periodId?: number | null;
  maxMarks?: number;
  updatedAt?: number;
}

export interface LocalExamResult {
  id?: number;
  examId: number;
  studentId: number;
  marksObtained: number;
  remarks?: string | null;
  updatedAt?: number;
}

export interface LocalSubject {
  id?: number;
  subjectName: string;
  subjectCode?: string | null;
  category?: string | null;
  updatedAt?: number;
}

export interface LocalReferenceItem {
  id?: number;
  type: "class" | "subject" | "session" | "period" | "section" | "studentFees" | "attendance" | "exams" | "examResults";
  remoteId?: number | string | null;
  label: string;
  payload: any;
  updatedAt?: number;
}

export interface LocalFeePayment {
  id?: number;
  feeId: number;
  amount: number;
  reduction?: number;
  paymentMode?: string;
  reference?: string;
  monthConcerned?: string;
  notes?: string;
  datePaid?: string;
  isProvisoire?: boolean;
  updatedAt?: number;
}

export interface LocalAttendanceBatch {
  id?: number;
  classId: number;
  subjectId?: number | null;
  employeeId?: number | null;
  date: string;
  records: any[];
  sendSMS?: boolean;
  sendWhatsApp?: boolean;
  updatedAt?: number;
}

export interface LocalStudentPhoto {
  numAdmission: string;
  photoData: string;
  updatedAt?: number;
}

export interface OutboxAction {
  id?: number;
  actionType: 'INSERT' | 'UPDATE' | 'DELETE';
  targetTable: string;
  entity?: string;
  entityId?: string | number | null;
  payload: any;
  status?: "pending" | "syncing" | "synced" | "failed" | "conflict" | "cancelled";
  timestamp: number;
  updatedAt?: number;
  syncedAt?: number | null;
  retryCount?: number;
  lastError?: string | null;
  idempotencyKey?: string;
  userId?: number | string | null;
  schoolId?: number | string | null;
  conflict?: any;
}

class EdutLocalDatabase extends Dexie {
  students!: Table<LocalStudent>;
  exams!: Table<LocalExam>;
  examResults!: Table<LocalExamResult>;
  subjects!: Table<LocalSubject>;
  references!: Table<LocalReferenceItem>;
  feePayments!: Table<LocalFeePayment>;
  attendanceBatches!: Table<LocalAttendanceBatch>;
  studentPhotos!: Table<LocalStudentPhoto>;
  outbox!: Table<OutboxAction>;

  constructor() {
    super('EdutLocalDatabase');
    this.version(1).stores({
      students: '++id, numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      outbox: '++id, actionType, targetTable, timestamp',
    });

    this.version(2).stores({
      students: '++id, numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      outbox: '++id, actionType, targetTable, timestamp, retryCount',
    });

    this.version(3).stores({
      students: '++id, numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      feePayments: '++id, feeId, reference, datePaid, updatedAt',
      outbox: '++id, actionType, targetTable, timestamp, retryCount',
    });

    this.version(4).stores({
      students: '++id, numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      references: '++id, type, remoteId, label, updatedAt',
      feePayments: '++id, feeId, reference, datePaid, updatedAt',
      attendanceBatches: '++id, classId, subjectId, date, updatedAt',
      outbox: '++id, actionType, targetTable, status, timestamp, updatedAt, syncedAt, retryCount, idempotencyKey, userId, schoolId',
    });

    this.version(5).stores({
      students: '++id, numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      references: '++id, type, remoteId, label, updatedAt',
      feePayments: '++id, feeId, reference, datePaid, updatedAt',
      attendanceBatches: '++id, classId, subjectId, date, updatedAt',
      studentPhotos: 'numAdmission, updatedAt',
      outbox: '++id, actionType, targetTable, status, timestamp, updatedAt, syncedAt, retryCount, idempotencyKey, userId, schoolId',
    });
  }
}

export const localDb = new EdutLocalDatabase();
