import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMenstrualCycleSchema } from "@shared/schema";
import { subMonths } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/menstrual-cycles", async (req, res) => {
    try {
      const sixMonthsAgo = subMonths(new Date(), 6);
      const cycles = await storage.getMenstrualCycles(req.user?.id);
      const filteredCycles = cycles.filter(cycle => 
        new Date(cycle.startDate) >= sixMonthsAgo
      );
      res.json(filteredCycles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menstrual cycles" });
    }
  });

  app.get("/api/menstrual-cycles/active", async (req, res) => {
    try {
      const activeCycle = await storage.getActiveCycle(req.user?.id);
      res.json(activeCycle || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active cycle" });
    }
  });

  app.post("/api/menstrual-cycles", async (req, res) => {
    try {
      const validatedData = insertMenstrualCycleSchema.parse(req.body);
      
      const activeCycle = await storage.getActiveCycle(req.user?.id);
      if (activeCycle && validatedData.startDate && !validatedData.endDate) {
        return res.status(400).json({ 
          error: "There is already an active cycle. Please end it before starting a new one." 
        });
      }
      
      const cycle = await storage.createMenstrualCycle({
        ...validatedData,
        userId: req.user?.id || null,
      });
      
      res.status(201).json(cycle);
    } catch (error) {
      res.status(400).json({ error: "Invalid cycle data" });
    }
  });

  app.patch("/api/menstrual-cycles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateMenstrualCycle(id, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: "Cycle not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Failed to update cycle" });
    }
  });

  app.delete("/api/menstrual-cycles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMenstrualCycle(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Cycle not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete cycle" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
