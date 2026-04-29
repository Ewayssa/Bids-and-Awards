import React from 'react';

const POPrintLayout = React.forwardRef(({ data, prItems }, ref) => {
    if (!data) return null;

    const items = prItems || [];
    // Ensure we have at least 15 rows for that "classic" form look if needed, 
    // but the requirement says dynamic so we just map what we have.
    
    return (
        <div ref={ref} className="bg-white p-8 text-black font-serif text-sm print:p-0" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="border-2 border-black p-1">
                <div className="text-center mb-4 border-b-2 border-black pb-2">
                    <h1 className="text-xl font-bold uppercase">Purchase Order</h1>
                    <h2 className="text-lg font-bold">DILG REGION 1</h2>
                </div>

                <div className="grid grid-cols-2 border-b-2 border-black">
                    <div className="border-r-2 border-black p-2 space-y-1">
                        <div className="flex gap-2">
                            <span className="font-bold min-w-[80px]">Supplier:</span>
                            <span className="font-bold underline uppercase">{data.supplier_name}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold min-w-[80px]">Address:</span>
                            <span className="underline">{data.supplier_address}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold min-w-[80px]">TIN:</span>
                            <span className="underline">{data.tin}</span>
                        </div>
                    </div>
                    <div className="p-2 space-y-1">
                        <div className="flex gap-2">
                            <span className="font-bold min-w-[150px]">Purchase Order No.:</span>
                            <span className="underline">{data.po_no}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold min-w-[150px]">Date:</span>
                            <span className="underline">{data.date}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold min-w-[150px]">Mode of Procurement:</span>
                            <span className="underline uppercase text-xs">{data.mode_of_procurement}</span>
                        </div>
                    </div>
                </div>

                <div className="p-2 border-b-2 border-black italic text-xs">
                    Gentlemen:
                    <br />
                    Please furnish this Office the following articles subject to the terms and conditions contained herein:
                </div>

                <div className="grid grid-cols-2 border-b-2 border-black">
                    <div className="border-r-2 border-black p-2">
                        <div className="flex gap-2">
                            <span className="font-bold">Place of Delivery:</span>
                            <span>{data.place_of_delivery}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold">Date of Delivery:</span>
                            <span>{data.date_of_delivery}</span>
                        </div>
                    </div>
                    <div className="p-2">
                        <div className="flex gap-2">
                            <span className="font-bold">Payment Term:</span>
                            <span>{data.payment_term}</span>
                        </div>
                    </div>
                </div>

                <table className="w-full border-collapse border-b-2 border-black">
                    <thead>
                        <tr className="border-b-2 border-black text-xs font-bold">
                            <th className="border-r-2 border-black p-1 w-20 text-center">Stock/ Property No.</th>
                            <th className="border-r-2 border-black p-1 w-16 text-center">Unit</th>
                            <th className="border-r-2 border-black p-1 text-center">Description</th>
                            <th className="border-r-2 border-black p-1 w-16 text-center">Quantity</th>
                            <th className="border-r-2 border-black p-1 w-24 text-center">Unit Cost</th>
                            <th className="p-1 w-28 text-center">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="min-h-[400px]">
                        {items.map((item, idx) => (
                            <tr key={idx} className="text-xs">
                                <td className="border-r-2 border-black p-1 text-center h-8">{item.stockNo || ''}</td>
                                <td className="border-r-2 border-black p-1 text-center">{item.unit}</td>
                                <td className="border-r-2 border-black p-1">{item.description}</td>
                                <td className="border-r-2 border-black p-1 text-center">{item.quantity}</td>
                                <td className="border-r-2 border-black p-1 text-right">
                                    {Number(item.final_unit_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-1 text-right font-bold">
                                    {Number(item.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                        {/* Empty rows to maintain structure if needed */}
                        {[...Array(Math.max(0, 10 - items.length))].map((_, i) => (
                            <tr key={`empty-${i}`} className="h-8">
                                <td className="border-r-2 border-black"></td>
                                <td className="border-r-2 border-black"></td>
                                <td className="border-r-2 border-black"></td>
                                <td className="border-r-2 border-black"></td>
                                <td className="border-r-2 border-black"></td>
                                <td></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black font-bold text-xs">
                            <td colSpan="2" className="border-r-2 border-black p-2">(Total Amount in Words)</td>
                            <td className="border-r-2 border-black p-2 italic uppercase">
                                {data.amount_in_words}
                            </td>
                            <td colSpan="2" className="border-r-2 border-black p-2 text-right">TOTAL</td>
                            <td className="p-2 text-right text-sm">
                                ₱{Number(data.final_total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div className="p-2 border-b-2 border-black text-[10px]">
                    In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10) of one percent for every day of delay shall be imposed on the undelivered item/s.
                </div>

                <div className="grid grid-cols-2 border-b-2 border-black">
                    <div className="border-r-2 border-black p-4">
                        <div className="mb-8">Conforme:</div>
                        <div className="text-center">
                            <div className="border-b border-black mx-auto w-3/4"></div>
                            <div className="text-[10px] mt-1 font-bold">Signature over Printed Name of Supplier</div>
                            <div className="mt-4 border-b border-black mx-auto w-1/2"></div>
                            <div className="text-[10px] mt-1">Date</div>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="mb-8">Very truly yours,</div>
                        <div className="text-center font-bold">
                            <div className="mb-0 text-sm">JUNATHAN PAUL M. LEUSEN, JR., CESO III</div>
                            <div className="border-b border-black mx-auto w-full"></div>
                            <div className="text-[10px] mt-1 font-bold">Regional Director</div>
                            <div className="mt-4 border-b border-black mx-auto w-1/2 h-4"></div>
                            <div className="text-[10px] mt-1 font-normal">Designation</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2">
                    <div className="border-r-2 border-black p-2 text-xs space-y-2">
                        <div className="flex gap-2">
                            <span className="font-bold">Fund Cluster:</span>
                            <span className="border-b border-black flex-1">{data.fund_cluster}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold">Funds Available:</span>
                            <span className="border-b border-black flex-1">{data.funds_available}</span>
                        </div>
                        <div className="text-center mt-6">
                            <div className="font-bold underline uppercase">DENNIS A. LIM</div>
                            <div className="text-[10px]">ACCOUNTANT II</div>
                            <div className="text-[10px] mt-1">Signature over Printed Name of Authorized Official</div>
                        </div>
                    </div>
                    <div className="p-2 text-xs space-y-2">
                        <div className="flex gap-2">
                            <span className="font-bold min-w-[120px]">ORS/BURS No.:</span>
                            <span className="border-b border-black flex-1">{data.ors_burs_no}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold min-w-[120px]">Date of the ORS/BURS:</span>
                            <span className="border-b border-black flex-1">{data.date_of_ors_burs}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold min-w-[120px]">Amount:</span>
                            <span className="border-b border-black flex-1">
                                {data.ors_burs_amount ? `₱${Number(data.ors_burs_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="text-[10px] text-right mt-1 italic">Appendix 61</div>
        </div>
    );
});

export default POPrintLayout;
