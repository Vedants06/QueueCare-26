import type { Patient } from '../../../../shared/types';

/**
 * Stable sort for the active queue.
 * Order: serving → priority waiting → normal waiting → done → skipped
 *
 * Absent patients are NEVER in queue[] — they live in absentPatients[].
 * This function does not touch absentPatients.
 *
 * Within each group, original arrival order (addedAt) is preserved.
 */
export function applyPrioritySort(queue: Patient[]): Patient[] {
  const serving: Patient[] = [];
  const priorityWaiting: Patient[] = [];
  const normalWaiting: Patient[] = [];
  const done: Patient[] = [];
  const skipped: Patient[] = [];

  for (const patient of queue) {
    switch (patient.status) {
      case 'serving':
        serving.push(patient);
        break;
      case 'waiting':
        if (patient.priority) {
          priorityWaiting.push(patient);
        } else {
          normalWaiting.push(patient);
        }
        break;
      case 'done':
        done.push(patient);
        break;
      case 'skipped':
        skipped.push(patient);
        break;
      // 'absent' patients should never be in queue[]
      // but if somehow present, treat as skipped to be safe
      case 'absent':
        skipped.push(patient);
        break;
    }
  }

  // Within each group, order by addedAt ascending (preserve arrival order)
  const sortByAddedAt = (a: Patient, b: Patient) => a.addedAt - b.addedAt;

  priorityWaiting.sort(sortByAddedAt);
  normalWaiting.sort(sortByAddedAt);
  done.sort(sortByAddedAt);
  skipped.sort(sortByAddedAt);

  return [
    ...serving,
    ...priorityWaiting,
    ...normalWaiting,
    ...done,
    ...skipped,
  ];
}

/**
 * Insert a reinstated patient at the front of the waiting group.
 * "Front" means before ALL other waiting patients (including priority ones).
 * The receptionist made this choice explicitly.
 */
export function insertAtFront(queue: Patient[], patient: Patient): Patient[] {
  // Find where waiting patients start (after serving)
  const servingCount = queue.filter((p) => p.status === 'serving').length;

  const result = [...queue];
  result.splice(servingCount, 0, patient);
  return result;
}

/**
 * Insert a reinstated patient at the back of the waiting group.
 * "Back" means after all other waiting patients.
 * Priority sort will then position them correctly within their priority group.
 */
export function insertAtBack(queue: Patient[], patient: Patient): Patient[] {
  // Find the index after the last waiting patient
  let lastWaitingIndex = -1;
  for (let i = 0; i < queue.length; i++) {
    if (queue[i].status === 'waiting' || queue[i].status === 'serving') {
      lastWaitingIndex = i;
    }
  }

  const result = [...queue];
  result.splice(lastWaitingIndex + 1, 0, patient);
  return result;
}