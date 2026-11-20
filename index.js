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



// Place Order API
app.post("/orders", async (req, res) => {
  try {
    const { itemId, deliveryAddress } = req.body;

    // Validate required fields
    if (!itemId || !deliveryAddress?.trim()) {
      return res.status(400).json({
        error: "Item ID and delivery address are required.",
      });
    }

    // Validate MongoDB ID
    if (!ObjectId.isValid(itemId)) {
      return res.status(400).json({
        error: "Invalid item ID.",
      });
    }

    // Find menu item
    const item = await pizzaItems.findOne({
      _id: new ObjectId(itemId),
    });

    if (!item) {
      return res.status(404).json({
        error: "Menu item not found.",
      });
    }

    // Create order
    const newOrder = {
      itemId: new ObjectId(itemId),
      itemName: item.name,
      itemImage: item.image || item.images?.[0] || "",
      price: Number(item.price || 0),
      category: item.category || "",
      vendorId: item.vendorId || null,
      vendorName: item.vendorName || "Vendor",
      deliveryAddress: deliveryAddress.trim(),
      status: "pending",
      createdAt: new Date(),
    };

    const result = await ordersCollection.insertOne(newOrder);

    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      orderId: result.insertedId,
    });
  } catch (error) {
    console.error("Place Order Error:", error);

    res.status(500).json({
      error: "Failed to place order.",
    });
  }
});


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