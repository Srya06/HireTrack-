import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_TRANSITIONS,
  TERMINAL_APPLICATION_STATUSES
} from '../utils/constants.js';

/**
 * Pure function to validate application status transitions based on the transition map.
 *
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @returns {{ isValid: boolean, reason?: string }}
 */
export const validateStatusTransition = (currentStatus, targetStatus) => {
  if (!currentStatus || !Object.values(APPLICATION_STATUSES).includes(currentStatus)) {
    return {
      isValid: false,
      reason: `Current status '${currentStatus}' is invalid`
    };
  }

  if (!targetStatus || !Object.values(APPLICATION_STATUSES).includes(targetStatus)) {
    return {
      isValid: false,
      reason: `Target status '${targetStatus}' is not a recognized application status`
    };
  }

  if (currentStatus === targetStatus) {
    return {
      isValid: false,
      reason: `Application is already in status '${currentStatus}'`
    };
  }

  // Check if current status is terminal
  if (TERMINAL_APPLICATION_STATUSES.includes(currentStatus)) {
    return {
      isValid: false,
      reason: `Status '${currentStatus}' is terminal and cannot transition to '${targetStatus}'`
    };
  }

  const allowedTransitions = APPLICATION_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(targetStatus)) {
    return {
      isValid: false,
      reason: `Invalid transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${
        allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'None'
      }`
    };
  }

  return {
    isValid: true
  };
};

export const isTerminalStatus = (status) => {
  return TERMINAL_APPLICATION_STATUSES.includes(status);
};
