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
  updatedAt?: number;
}

export interface OutboxAction {
  id?: number;
  actionType: 'INSERT' | 'UPDATE' | 'DELETE';
  targetTable: string;
  payload: any;
  timestamp: number;
  retryCount?: number;
  lastError?: string | null;
}

class EdutLocalDatabase extends Dexie {
  students!: Table<LocalStudent>;
  exams!: Table<LocalExam>;
  examResults!: Table<LocalExamResult>;
  subjects!: Table<LocalSubject>;
  feePayments!: Table<LocalFeePayment>;
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
  }
}

export const localDb = new EdutLocalDatabase();
