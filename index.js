import express from 'express';
import 'dotenv/config'
import cors from "cors";
import { MongoClient, ObjectId } from 'mongodb';


const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(express.json());
app.use(cors());

//mongodb
const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const connectedClient = await connectToMongoDB()
const database = connectedClient.db("pizza-baba")
const user = database.collection("user")
const pizzaItems = database.collection("pizzaItems")
const ordersCollection = database.collection("orders");








/* =========================================
   CANCEL CUSTOMER ORDER
========================================= */

app.delete("/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!ObjectId.isValid(orderId)) {
      return res.status(400).json({
        error: "Invalid order ID.",
      });
    }

    const result = await ordersCollection.updateOne(
      {
        _id: new ObjectId(orderId),
        status: { $in: ["Pending", "pending"] },
      },
      {
        $set: {
          status: "Cancelled",
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: "Order not found or already handled.",
      });
    }

    const updatedOrder = await ordersCollection.findOne({
      _id: new ObjectId(orderId),
    });

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Cancel Order Error:", error);

    return res.status(500).json({
      error: error.message || "Failed to cancel order.",
    });
  }
});








/* =========================================
   UPDATE MENU ITEM STATUS
========================================= */

app.patch("/items/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "Invalid item ID.",
      });
    }

    const allowedStatuses = [
      "Pending",
      "Approved",
      "Rejected",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status.",
      });
    }

    const result = await pizzaItems.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: "Menu item not found.",
      });
    }

    const updatedItem = await pizzaItems.findOne({
      _id: new ObjectId(id),
    });

    return res.status(200).json({
      success: true,
      message: `Item status updated to ${status}.`,
      item: updatedItem,
    });
  } catch (error) {
    console.error("Update Menu Item Status Error:", error);

    return res.status(500).json({
      error: error.message || "Failed to update item status.",
    });
  }
});



/* =========================================
   DELETE MENU ITEM
========================================= */

app.delete("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "Invalid item ID.",
      });
    }

    const result = await pizzaItems.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: "Menu item not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Menu item deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Menu Item Error:", error);

    return res.status(500).json({
      error: error.message || "Failed to delete menu item.",
    });
  }
});






//change status
app.patch("/orders/vendor/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { vendorId, action } = req.body;

    if (!ObjectId.isValid(orderId)) {
      return res.status(400).json({
        error: "Invalid order ID.",
      });
    }

    if (!vendorId) {
      return res.status(400).json({
        error: "Vendor ID is required.",
      });
    }

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        error: "Invalid action.",
      });
    }

    const newStatus =
      action === "accept" ? "Accepted" : "Rejected";

    const order = await ordersCollection.findOne({
      _id: new ObjectId(orderId),
      vendorId: vendorId,
    });

    if (!order) {
      return res.status(404).json({
        error: "Order not found.",
      });
    }

    if (
      !["Pending", "pending"].includes(order.status)
    ) {
      return res.status(409).json({
        error: "This order has already been handled.",
      });
    }

    const result = await ordersCollection.updateOne(
      {
        _id: new ObjectId(orderId),
        vendorId: vendorId,
        status: order.status,
      },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(409).json({
        error: "Order status could not be updated.",
      });
    }

    const updatedOrder = await ordersCollection.findOne({
      _id: new ObjectId(orderId),
    });

    res.status(200).json({
      success: true,
      message: `Order ${newStatus} successfully.`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update Order Status Error:", error);

    res.status(500).json({
      error: "Failed to update order status.",
    });
  }
});





 // Get orders for a specific vendor
app.get("/orders/vendor/:vendorId", async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({
        error: "Vendor ID is required.",
      });
    }

    const vendorOrders = await ordersCollection
      .find({
        vendorId: vendorId,
      })
      .sort({ _id: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      totalOrders: vendorOrders.length,
      orders: vendorOrders,
    });
  } catch (error) {
    console.error("Fetch Vendor Orders Error:", error);

    res.status(500).json({
      error: "Failed to fetch vendor orders.",
    });
  }
});



//get orders
app.get("/orders/customer/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        error: "Customer user ID is required.",
      });
    }

    const customerOrders = await ordersCollection
      .find({
        customerId: customerId,
      })
      .sort({ _id: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      totalOrders: customerOrders.length,
      orders: customerOrders,
    });
  } catch (error) {
    console.error("Fetch Customer Orders Error:", error);

    res.status(500).json({
      error: "Failed to fetch customer orders.",
    });
  }
});



//post orders
app.post('/orders', async (req, res) => {
    // Record the exact order time on the server (authoritative UTC ISO string).
    // Kept after the spread so a client-sent timestamp can never override it.
    const item = {
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    const result = await ordersCollection.insertOne(item);
    res.send(result)
})

// Get single menu item by ID
app.get("/item/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid item ID",
      });
    }

    const result = await pizzaItems.findOne({
      _id: new ObjectId(id),
    });

    if (!result) {
      return res.status(404).json({
        message: "Menu item not found",
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Get Item Error:", error);

    res.status(500).json({
      message: "Failed to load menu item",
    });
  }
});


// Delete Menu Item
app.delete("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    const result = await pizzaItems.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.status(200).json({
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to delete menu item" });
  }
});



// Update Menu Item
app.put('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid item ID"
            });
        }

        const result = await pizzaItems.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: "Menu item not found"
            });
        }

        res.status(200).json({
            message: "Menu item updated successfully",
            result
        });

    } catch (error) {
        console.error("Update error:", error);

        res.status(500).json({
            message: "Failed to update menu item"
        });
    }
});


// Get items by userId
app.get('/items/:userId', async (req, res) => {
  const userId = req.params.userId;

  const result = await pizzaItems.find({ userId: userId }).toArray();

  res.send(result);
});

//get items
app.get('/items', async (req, res) => {
     const cursor = pizzaItems.find();
    const result = await cursor.toArray();
    res.send(result);
})

//add Item
app.post('/additems', async (req, res) => {
    const item = req.body;
    const result = await pizzaItems.insertOne(item);
    res.send(result)
})



//get user
app.get('/user',async(req,res)=>{
    const cursor = user.find({});
    const result =await cursor.toArray()
    res.send(result)
})

app.get("/", (req, res) => {
  res.send("Pizza Baba Server is Running!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// Vercel Serverless Function
export default app;