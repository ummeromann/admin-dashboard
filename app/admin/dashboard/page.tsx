"use client";

import React, { useEffect, useState } from "react";
import { client } from "@/sanity/lib/client";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import Swal from "sweetalert2";
import ProtectedRoute from "@/app/components/ProtectedRoute";

interface Order {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  total: number;
  discount: number;
  orderDate: string;
  status: string | null;
  cartItems: { name: string; image: string }[];
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    client
      .fetch(
        `*[_type == "order"]{
          _id,
          firstName,
          lastName,
          phone,
          email,
          address,
          city,
          zipCode,
          total,
          discount,
          orderDate,
          status,
          cartItems[]->{
            name,
            image
          }
        }`
      )
      .then((data) => setOrders(data))
      .catch((error) => console.error("Error fetching orders:", error));
  }, []);

  const filteredOrders =
    filter === "All" ? orders : orders.filter((order) => order.status === filter);

  const toggleOrderDetails = (orderId: string) => {
    setSelectedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const handleDelete = async (orderId: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      await client.delete(orderId);
      setOrders((prevOrders) => prevOrders.filter((order) => order._id !== orderId));
      Swal.fire("Deleted!", "Your order has been deleted.", "success");
    } catch (error) {
      console.error("Error deleting order:", error);
      Swal.fire("Error!", "Something went wrong while deleting.", "error");
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await client
        .patch(orderId)
        .set({ status: newStatus })
        .commit();
      
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );

      if (newStatus === "dispatch") {
        Swal.fire("Dispatch", "The order is now dispatched.", "success");
      } else if (newStatus === "success") {
        Swal.fire("Success", "The order has been completed.", "success");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      Swal.fire("Error!", "Something went wrong while updating the status.", "error");
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-100">
        {/* Navbar */}
        <nav className="bg-red-600 text-white p-4 shadow-lg flex justify-between">
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <div className="flex space-x-4">
            {["All", "pending", "dispatch", "success"].map((status) => (
              <button
                key={status}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filter === status ? "bg-white text-red-600 font-bold" : "text-white"
                }`}
                onClick={() => setFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </nav>

      {/* Orders Section */}
      <div className="flex-1 p-6">
        <h2 className="text-3xl font-bold text-center text-red-600 mb-6">Orders</h2>

        <div className="overflow-x-auto bg-white shadow-lg rounded-xl p-4">
          <table className="min-w-full divide-y divide-gray-200 text-sm lg:text-base">
            <thead className="bg-gray-100 text-red-600">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Address</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <React.Fragment key={order._id}>
                  <tr
                    className="cursor-pointer hover:bg-red-50 transition-all"
                    onClick={() => toggleOrderDetails(order._id)}
                  >
                    <td className="px-4 py-2">{order._id}</td>
                    <td className="px-4 py-2">{order.firstName} {order.lastName}</td>
                    <td className="px-4 py-2">{order.address}</td>
                    <td className="px-4 py-2">{new Date(order.orderDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2 font-semibold text-green-600">${order.total}</td>
                    <td className="px-4 py-2">
                      <select
                        value={order.status || ''}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className="bg-gray-100 p-1 rounded border border-gray-300 focus:ring-2 focus:ring-red-400"
                      >
                        <option value="pending">Pending</option>
                        <option value="dispatch">Dispatch</option>
                        <option value="success">Completed</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(order._id);
                        }}
                        className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-700 transition shadow-sm hover:shadow-md"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>

                  {/* Order Details */}
                  {selectedOrderId === order._id && (
                    <tr>
                      <td colSpan={7} className="bg-gray-50 p-4 animate-fadeIn rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h3 className="font-bold text-lg mb-2">Order Details</h3>
                            <p><strong>Phone:</strong> {order.phone}</p>
                            <p><strong>Email:</strong> {order.email}</p>
                            <p><strong>City:</strong> {order.city}</p>
                          </div>

                          <div>
                            <h4 className="font-bold text-md mb-2">Cart Items:</h4>
                            <ul className="space-y-2">
                              {order.cartItems.map((item, index) => (
                                <li key={`${order._id}-${index}`} className="flex items-center gap-3 bg-white shadow-sm rounded-lg p-2">
                                  <div>{item.name}</div>
                                  {item.image && (
                                    <Image
                                      src={urlFor(item.image).url()}
                                      width={50}
                                      height={50}
                                      alt={item.name}
                                      className="rounded-md shadow-md"
                                    />
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </ProtectedRoute>
);
}
