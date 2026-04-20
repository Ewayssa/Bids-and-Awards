import React from 'react';
import { motion } from 'framer-motion';
import { 
    MdFlag, MdDescription, MdHistory, MdGroup, 
    MdCampaign, MdPointOfSale, MdCheckCircle, 
    MdOutlineAssignmentTurnedIn, MdGavel, 
    MdVerified, MdForward, MdAssignment, 
    MdInventory, MdPayments
} from 'react-icons/md';
import { WORKFLOW_STAGES } from '../../constants/docTypes';

const STAGE_ICONS = {
    1: MdFlag,
    2: MdDescription,
    3: MdGroup,
    4: MdCampaign,
    5: MdPointOfSale,
    6: MdGavel,
    7: MdVerified,
    8: MdOutlineAssignmentTurnedIn,
    9: MdForward,
    10: MdAssignment,
    11: MdInventory,
    12: MdPayments
};

const ProcurementRoadmap = ({ currentStage = 1, completedStages = [] }) => {
    return (
        <div className="w-full py-12 px-4 overflow-x-auto no-scrollbar">
            <div className="min-w-[1200px] relative">
                {/* Connection Line Background */}
                <div className="absolute top-[40px] left-[50px] right-[50px] h-1 bg-slate-100 dark:bg-slate-800 rounded-full" />
                
                {/* Active Progress Line */}
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStage - 1) / (WORKFLOW_STAGES.length - 1)) * 100}%` }}
                    className="absolute top-[40px] left-[50px] h-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full z-10 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                    transition={{ duration: 1, ease: "easeInOut" }}
                />

                <div className="flex justify-between relative z-20">
                    {WORKFLOW_STAGES.map((stage, index) => {
                        const Icon = STAGE_ICONS[stage.id] || MdDescription;
                        const isCompleted = stage.id < currentStage;
                        const isActive = stage.id === currentStage;
                        const isLocked = stage.id > currentStage;

                        return (
                            <div key={stage.id} className="flex flex-col items-center w-24">
                                {/* node */}
                                <motion.div
                                    whileHover={!isLocked ? { scale: 1.1 } : {}}
                                    className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 border-4 ${
                                        isActive 
                                            ? 'bg-white dark:bg-slate-800 border-blue-500 shadow-2xl shadow-blue-500/20 scale-110' 
                                            : isCompleted 
                                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'
                                    }`}
                                >
                                    {isCompleted ? (
                                        <MdCheckCircle className="w-10 h-10" />
                                    ) : (
                                        <Icon className={`w-8 h-8 ${isActive ? 'text-blue-600' : ''}`} />
                                    )}
                                </motion.div>

                                {/* Label */}
                                <div className="mt-4 text-center">
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                                        isActive ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                                    }`}>
                                        Step {stage.id}
                                    </p>
                                    <h4 className={`text-xs font-bold mt-1 max-w-[80px] mx-auto leading-tight ${
                                        isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500'
                                    }`}>
                                        {stage.name}
                                    </h4>
                                </div>

                                {/* Status Tooltip (Implicit) */}
                                {isActive && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute -bottom-12 bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold shadow-xl whitespace-nowrap"
                                    >
                                        Current Action: {stage.description}
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                                    </motion.div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ProcurementRoadmap;
