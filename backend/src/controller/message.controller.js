import Message from "../model/message.model.js";
import User from "../model/user.model.js";
import cloudinary  from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";
import { getReceiverSocketId } from "../lib/socket.js";


export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select('_id email fullName profilePic');

        res.status(200).json(filteredUsers);
        // Fetch distinct user IDs who have exchanged messages with the logged-in user
        // const messages = await Message.find({
        //     $or: [
        //         { sender: loggedInUserId },
        //         { receiver: loggedInUserId }
        //     ]
        // }).select('sender receiver -_id');

        // const userIdsSet = new Set();
        // messages.forEach(msg => {
        //     userIdsSet.add(msg.sender.toString());
        //     userIdsSet.add(msg.receiver.toString());
        // });
        // userIdsSet.delete(loggedInUserId.toString()); // Remove logged-in user's ID

        // const userIds = Array.from(userIdsSet);

        // Fetch user details for these IDs
        // const users = await User.find({ _id: { $in: userIds } }).select('_id email fullname profilepic');

        // res.status(200).json(users);
    } catch (err) {
        console.log("Error in getUsersForSidebar controller:", err);
        res.status(500).json({ message: err.message });
}
};

export const getMessages = async (req, res) => {
    try {
        const {id: userToChatId} = req.params;
        const myUserId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myUserId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myUserId }
            ]
        }) //.sort({ createdAt: 1 }); // Sort messages by creation time in ascending order

        res.status(200).json(messages);
    } catch (err) {
        console.log("Error in getMessagesBetweenUsers controller:", err);
        res.status(500).json({ message: err.message });
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text, image} = req.body;
        const {id: receiverId} = req.params;
        const senderId = req.user._id;

        let imageUrl = null;    
        if(image){
            const uploadResponse=  await cloudinary.uploader.upload(image);
            imageUrl= uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });

        await newMessage.save();

        const receiverSocketId = getReceiverSocketId(receiverId);
        if(receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);
    } catch (err) {
        console.log("Error in sendMessage controller:", err);
        res.status(500).json({ message: err.message });
    }
}