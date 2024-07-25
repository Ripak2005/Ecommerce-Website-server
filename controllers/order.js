import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import sendMail from "../middlewares/sendMail.js";

export const newOrderCod = async(req, res) => {
    try {
        const {method, phone, address} = req.body;

        const cart = await Cart.find({user: req.user._id}).populate("product");

        let subTotal = 0;

        cart.forEach((i) => {
            const itemSubtotal = i.product.price * i.quantity;
            subTotal += itemSubtotal;
        })

        const items = await Cart.find({user: req.user._id}).select("-_id").select("-user").select("-__v");

        const order = await Order.create({
            items,
            method,
            user: req.user._id,
            phone,
            address,
            subTotal,
        })

        for(let i of order.items){
            let product = await Product.findOne({_id: i.product})

            product.$inc("stock", -1 * i.quantity)
            product.$inc("sold", +i.quantity)

            await product.save();
        }

        await Cart.find({user: req.user._id}).deleteMany()

        await sendMail(
            req.user.email,
            "DKart",
            `Thanks you for shopping of ₹ ${subTotal} from our Platform, your order will be delivered soon`
        )

        res.status(201).json({
            message: "Order Placed Successfully",
            order,
        })
    } catch (error) {
        res.status(500).json({
            message: error.message,
        })
    }
}

export const getAllOrder = async(req, res) => {
    try {
        const orders = await Order.find({
            user: req.user._id
        })

        res.json({orders: orders.reverse()})
    } catch (error) {
        res.status(500).json({
            message: error.message,
        })
    }
}

export const getAllOrderAdmin = async(req, res) => {
    try {
        if(req.user.role !== 'admin') return res.status(403).json({
            message: 'Unauthorized'
        })

        const orders = await Order.find()

        res.json({orders})
    } catch (error) {
        res.status(500).json({
            message: error.message,
        })
    }
}

export const getMyOrder = async(req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate("items.product");

        res.json({order});
    } catch (error) {
        res.status(500).json({
            message: error.message,
        })
    }
}

export const updateStatus = async(req, res) => {
    try {
        if(req.user.role !== "admin"){
            return res.status(403).json({
                message: "You are not authorized to perform this action",
            })
        }

        const order = await Order.findById(req.params.id);

        if(order.status === "Pending"){
            order.status = "Processing";

            await sendMail(
                req.user.email,
                "DKart",
                `Your order is being processed and it will be delivered soon`
            )

            await order.save()

            return res.json({
                message: "Order Status Updated Successfully",
            })
        }

        if(order.status === "Processing"){
            order.status = "Shipped";

            await sendMail(
                req.user.email,
                "DKart",
                `Your order has been shipped and will be delivered soon`
            )

            await order.save()

            return res.json({
                message: "Order Status Updated Successfully",
            })
        }

        if(order.status === "Shipped"){
            order.status = "Out for delivery";

            await sendMail(
                req.user.email,
                "DKart",
                `Your order is out for delivery and will be delivered soon`
            )

            await order.save()

            return res.json({
                message: "Order Status Updated Successfully",
            })
        }

        if(order.status === "Out for delivery"){
            order.status = "Delivered";

            await sendMail(
                req.user.email,
                "DKart",
                `Your order has been delivered`,
                "Thank you for shopping"
            )

            await order.save()

            return res.json({
                message: "Order Status Updated Successfully",
            })
        }
    } catch (error) {
        res.status(500).json({
            message: error.message,
        })
    }
}

export const newOrderOnline = async() => {

}