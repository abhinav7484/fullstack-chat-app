import { generateToken } from '../lib/utils.js';
import User from '../model/user.model.js';
import bcrypt from 'bcryptjs';
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
    const {fullName, email, password} = req.body;
    try{
        
        if(!fullName || !email || !password){
            return res.status(400).json({message : "All fields are required"});
        }

        if(password.length < 6){
            return res.status(400).json({message : " Password must be at least 6 characters long"});
        }

        const user =await User.findOne({email});

        if(user){
            return res.status(400).json({message : "User already exists"});
        } 

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password,salt);

        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
        });
        
        if(newUser){
            generateToken(newUser._id,res);
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                profilePic: newUser.profilePic,
            });  
        }else{
            res.status(400).json({message:"Invalid user data"}); 
        }
    } catch(err){
        console.log("Error in signup controller:", err);
        res.status(500).json({message:err.message});
    }
};

export const login =async (req, res) => {
    const {email, password} = req.body;
    try{
        if(!email || !password){
            return res.status(400).json({message : "All fields are required"});
        }
        const user= await User.findOne({email});

        if(!user){
            return res.status(400).json({message : "User does not exist"});
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if(!isPasswordCorrect){
            return res.status(400).json({ message : "Wrong password"});
        }
        generateToken(user._id,res);
        res.status(200).json({
            _id: user._id,
            email: user.email,
            fullName: user.fullName,
            profilePic: user.profilePic,
        });
    } catch(err){
        console.log("Error in login controller:", err);
        res.status(500).json({message:err.message});
    }
}

export const logout =(req, res) => {
    try{
        res.cookie("jwt","", {maxAge:0});
        res.status(200).json({message:"Logged out successfully"});
    }catch(err){
        console.log("Error in logout controller:", err);
        res.status(500).json({message:err.message});
    }
}

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic : uploadResponse.secure_url }, 
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// export const checkAuth = (req, res) => {
//     try{
//         const user = req.user;
//         res.status(200).json(user);
//     }catch(err){
//         console.log("Error in checkAuth controller:", err);
//         res.status(500).json({message:err.message});
//     }
// }  
export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};