/**
 * Recurring Tasks Service
 * Handles automatic generation of recurring task instances
 */

import { db } from "./db";
import { tasks } from "../shared/schema";
import { eq, and, isNull, lte, gte, sql } from "drizzle-orm";

/**
 * Calculate the next occurrence date based on recurrence settings
 */
export function calculateNextOccurrence(
    currentDate: Date,
    recurrenceType: string,
    interval: number,
    dayOfWeek?: number | null,
    dayOfMonth?: number | null
): Date {
    const next = new Date(currentDate);

    switch (recurrenceType) {
        case "DAILY":
            next.setDate(next.getDate() + interval);
            break;

        case "WEEKLY":
            // Move to next occurrence of the specified day
            next.setDate(next.getDate() + (interval * 7));
            if (dayOfWeek !== undefined && dayOfWeek !== null) {
                // Adjust to the correct day of week
                const currentDay = next.getDay();
                const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
                if (daysToAdd === 0 && next <= currentDate) {
                    next.setDate(next.getDate() + 7);
                } else {
                    next.setDate(next.getDate() + daysToAdd);
                }
            }
            break;

        case "MONTHLY":
            next.setMonth(next.getMonth() + interval);
            if (dayOfMonth !== undefined && dayOfMonth !== null) {
                // Set to the specified day, handling month boundary
                const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
                next.setDate(Math.min(dayOfMonth, maxDay));
            }
            break;

        case "YEARLY":
            next.setFullYear(next.getFullYear() + interval);
            break;

        default:
            return next;
    }

    return next;
}

/**
 * Generate the next instance of a recurring task
 */
export async function generateNextRecurringInstance(templateTask: any): Promise<void> {
    if (!templateTask.isRecurring || templateTask.recurrenceType === "NONE") {
        return;
    }

    const now = new Date();

    // Check if recurrence has ended
    if (templateTask.recurrenceEndDate && new Date(templateTask.recurrenceEndDate) < now) {
        console.log(`Recurring task ${templateTask.id} has ended`);
        return;
    }

    // Calculate next occurrence
    const baseDate = templateTask.occurrenceDate || templateTask.dueDate || now;
    const nextOccurrence = calculateNextOccurrence(
        new Date(baseDate),
        templateTask.recurrenceType,
        templateTask.recurrenceInterval || 1,
        templateTask.recurrenceDayOfWeek,
        templateTask.recurrenceDayOfMonth
    );

    // Check if recurrence end date would be exceeded
    if (templateTask.recurrenceEndDate && nextOccurrence > new Date(templateTask.recurrenceEndDate)) {
        console.log(`Next occurrence would exceed end date for task ${templateTask.id}`);
        return;
    }

    // Create new instance
    const [newTask] = await db.insert(tasks).values({
        title: templateTask.title,
        responsibleUserId: templateTask.responsibleUserId,
        status: "TODO",
        dueDate: nextOccurrence,
        departmentId: templateTask.departmentId,
        hierarchyLevel: templateTask.hierarchyLevel,
        parentItemId: templateTask.parentItemId,
        creatorId: templateTask.creatorId,
        isRecurring: true,
        recurrenceType: templateTask.recurrenceType,
        recurrenceInterval: templateTask.recurrenceInterval,
        recurrenceDayOfWeek: templateTask.recurrenceDayOfWeek,
        recurrenceDayOfMonth: templateTask.recurrenceDayOfMonth,
        recurrenceEndDate: templateTask.recurrenceEndDate,
        parentRecurringTaskId: templateTask.parentRecurringTaskId || templateTask.id,
        occurrenceDate: nextOccurrence,
    }).returning();

    console.log(`Generated recurring task instance: ${newTask.id} for date ${nextOccurrence.toISOString()}`);
}

/**
 * Process all completed recurring tasks and generate next instances
 * This should be called when a recurring task is marked as DONE
 */
export async function processCompletedRecurringTask(taskId: string): Promise<void> {
    const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
    });

    if (!task || !task.isRecurring || task.recurrenceType === "NONE") {
        return;
    }

    await generateNextRecurringInstance(task);
}

/**
 * Generate upcoming recurring tasks for the next X days
 * This generates all future instances within the lookahead period
 */
export async function generateUpcomingRecurringTasks(lookaheadDays: number = 30): Promise<number> {
    const now = new Date();
    const lookaheadDate = new Date(now);
    lookaheadDate.setDate(lookaheadDate.getDate() + lookaheadDays);

    // Find all recurring template tasks that don't have upcoming instances
    const recurringTasks = await db.query.tasks.findMany({
        where: and(
            eq(tasks.isRecurring, true),
            sql`${tasks.recurrenceType} != 'NONE'`,
            // Only templates (no parent) or latest in chain
            isNull(tasks.parentRecurringTaskId)
        ),
    });

    let generatedCount = 0;

    for (const templateTask of recurringTasks) {
        // Check if there's already a TODO instance for this template
        const existingInstance = await db.query.tasks.findFirst({
            where: and(
                eq(tasks.parentRecurringTaskId, templateTask.id),
                eq(tasks.status, "TODO"),
                gte(tasks.dueDate, now)
            ),
        });

        if (!existingInstance) {
            await generateNextRecurringInstance(templateTask);
            generatedCount++;
        }
    }

    console.log(`Generated ${generatedCount} upcoming recurring task instances`);
    return generatedCount;
}

export default {
    calculateNextOccurrence,
    generateNextRecurringInstance,
    processCompletedRecurringTask,
    generateUpcomingRecurringTasks,
};
