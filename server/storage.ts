import { type User, type InsertUser, type MenstrualCycle, type InsertMenstrualCycle } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getMenstrualCycles(userId?: string, limit?: number): Promise<MenstrualCycle[]>;
  getMenstrualCycle(id: string): Promise<MenstrualCycle | undefined>;
  createMenstrualCycle(cycle: InsertMenstrualCycle): Promise<MenstrualCycle>;
  updateMenstrualCycle(id: string, cycle: Partial<InsertMenstrualCycle>): Promise<MenstrualCycle | undefined>;
  deleteMenstrualCycle(id: string): Promise<boolean>;
  getActiveCycle(userId?: string): Promise<MenstrualCycle | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private menstrualCycles: Map<string, MenstrualCycle>;

  constructor() {
    this.users = new Map();
    this.menstrualCycles = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getMenstrualCycles(userId?: string, limit?: number): Promise<MenstrualCycle[]> {
    let cycles = Array.from(this.menstrualCycles.values());
    
    if (userId) {
      cycles = cycles.filter(cycle => cycle.userId === userId);
    }
    
    cycles.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    if (limit) {
      cycles = cycles.slice(0, limit);
    }
    
    return cycles;
  }

  async getMenstrualCycle(id: string): Promise<MenstrualCycle | undefined> {
    return this.menstrualCycles.get(id);
  }

  async createMenstrualCycle(insertCycle: InsertMenstrualCycle): Promise<MenstrualCycle> {
    const id = randomUUID();
    const cycle: MenstrualCycle = { 
      ...insertCycle, 
      id,
      endDate: insertCycle.endDate || null,
      notes: insertCycle.notes || null,
      userId: insertCycle.userId || null
    };
    this.menstrualCycles.set(id, cycle);
    return cycle;
  }

  async updateMenstrualCycle(id: string, update: Partial<InsertMenstrualCycle>): Promise<MenstrualCycle | undefined> {
    const cycle = this.menstrualCycles.get(id);
    if (!cycle) return undefined;
    
    const updated: MenstrualCycle = { ...cycle, ...update };
    this.menstrualCycles.set(id, updated);
    return updated;
  }

  async deleteMenstrualCycle(id: string): Promise<boolean> {
    return this.menstrualCycles.delete(id);
  }

  async getActiveCycle(userId?: string): Promise<MenstrualCycle | undefined> {
    const cycles = Array.from(this.menstrualCycles.values())
      .filter(cycle => !cycle.endDate && (!userId || cycle.userId === userId))
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    return cycles[0];
  }
}

export const storage = new MemStorage();
